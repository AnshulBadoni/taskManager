import { redis } from "../Services/redis";
import { kafkaProducer } from "../Services/kafka";

export const deleteCache = async ( mainKey :string ,subKey: string) => {
  try {
    await redis.del(mainKey );
    await redis.del(subKey)
  } catch (error) {
    console.error("Error deleting cache:", error);
  }
};

export const setKafka = async (topic: string, event: string, payload: any) => {
  try {
    await kafkaProducer.send({
      topic,
      messages: [
        {
          value: JSON.stringify({
            event,
            data: payload,
          }),
        },
      ],
    });
  } catch (error) {
    console.error("Error sending message to Kafka:", error);
  }
};

 