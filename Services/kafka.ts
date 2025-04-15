import { Kafka } from "kafkajs"

const kafkaConfig = new Kafka({
  clientId:'taskManager',
  brokers: ['process.env.KAFKA_BROKERS'],
  // ssl: true,
  // sasl: {
  //   mechanism: "plain", // or scram-sha-256 / scram-sha-512 based on your Kafka provider
  //   username: process.env.KAFKA_USERNAME!,
  //   password: process.env.KAFKA_PASSWORD!,
  // },
})

export const kafkaProducer = kafkaConfig.producer()
export const kafkaConsumer = kafkaConfig.consumer({ groupId: 'taskManagerGroup' })


// helper to connect
export const connectKafka = async () => {
    await kafkaProducer.connect()
    await kafkaConsumer.connect()
    console.log("Kafka Producer and Consumer connected")
}