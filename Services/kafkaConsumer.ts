import { kafkaConsumer, kafkaProducer } from "./kafka";
import { redis } from "./redis";

const MAX_RETRIES = 3; // You can increase to 5 later
const RETRY_DELAY_MS = 5000; // 5 seconds wait before retry
const DLQ_TOPIC = "project-events-DLQ"; // Dead Letter Queue

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const startKafkaConsumer = async () => {
  await kafkaConsumer.connect();
  console.log("Kafka Consumer connected ✅");

  await kafkaConsumer.subscribe({
    topic: "project-events",
    fromBeginning: true,
  });


  await kafkaConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const value = message.value?.toString();
      if (!value) return;

      const eventMessage = JSON.parse(value);
      const { event, data } = eventMessage;

      console.log("Kafka received message:", eventMessage);

      let success = false;
      let attempts = 0;

      while (!success && attempts < MAX_RETRIES) {
        try {
          attempts++;

          // 👉 Your normal processing logic here
          if (event.startsWith("project-")) {
            console.log(`🔄 Event: ${event} - Clearing Project Cache...`);
            await redis.del("projects:all");
            await redis.del(`projects:name:${data.name}`);
          }
          else if (event.startsWith("task-")) {
            console.log(`🔄 Event: ${event} - Clearing Task Cache...`);
            await redis.del("task:all");
            await redis.del(`task:name:${data.name}`);
          }
          else {
            console.warn(`⚠️ Unknown Event Received: ${event}`);
          }

          success = true; // ✅ Processed successfully
        } catch (error) {
          console.error(`Retry #${attempts} failed:`, error);
          if (attempts < MAX_RETRIES) {
            console.log(`🔁 Retrying after ${RETRY_DELAY_MS / 1000} seconds...`);
            await sleep(RETRY_DELAY_MS);
          }
        }
      }

      if (!success) {
        console.error(`❌ Moving failed message to DLQ after ${MAX_RETRIES} attempts.`);

        try {
          await kafkaProducer.send({
            topic: DLQ_TOPIC,
            messages: [
              { value: value }, // Original message as-is
            ],
          });
          console.log("✅ Message moved to DLQ successfully.");
        } catch (error) {
          console.error("❌ Failed to move message to DLQ:", error);
        }
      }
    },
  });
};
