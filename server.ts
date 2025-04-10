import express, { Express, Request, Response } from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import { connectKafka } from "./Services/kafka";
import { startKafkaConsumer } from "./Services/kafkaConsumer";
import userRoutes from "./Routes/userRoutes";
import { initializeSocket } from "./Services/socket";
import projectRoutes from "./Routes/projectRoutes";

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// load services and middlewares
( async () => {
  await connectKafka(); // Connect Kafka when app starts
}) ();

startKafkaConsumer();

const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer);

// Routes
app.use("/auth", userRoutes);

app.use("/projects", projectRoutes);

app.get("/", (req: Request, res: Response) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/allrooms", (req: Request, res: Response) => {
  res.send({});
});

// Start the server
const PORT = process.env.PORT || 3001;
httpServer.listen({port:PORT}, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing HTTP server...');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT',() => {
  console.log('SIGTERM received. Closing HTTP server...');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
})