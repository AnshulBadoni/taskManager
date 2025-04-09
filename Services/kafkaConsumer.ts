import { kafkaConsumer } from "./kafka";
import { redis } from "./redis";
// import { getSocketServer } from "./socket";
import prisma from "../Connection/prisma"; // if needed to update db

export const startKafkaConsumer = async () => {
  await kafkaConsumer.connect();
  console.log("Kafka Consumer connected");

  await kafkaConsumer.subscribe({
    topic: "project-events",
    fromBeginning: true,
  });

  await kafkaConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const value = message.value?.toString();
      if (!value) return;

      const eventMessage = JSON.parse(value);
      console.log("kafka received message:", eventMessage);

      const { event, data } = eventMessage;

      switch (event) {
        case "project-created":
        case "project-updated":
        case "project-deleted":
        case "project-assigned":
        case "project-unassigned":
            console.log(`🔄 Event: ${event} - Clearing Project Cache...`);
            await redis.del("projects:all");
            await redis.del(`projects:name:${data.name}`);
            break;

        case "task-created":
        case "task-updated":
        case "task-deleted":
        case "task-assigned":
        case "task-unassigned":
            console.log(`🔄 Event: ${event} - Clearing task Cache...`);
            await redis.del("task:all");
            await redis.del(`task:name:${data.name}`);
            break;

        default:
            console.warn(`⚠️ Unknown Event Received: ${event}`);
        }
    },
  });
};
