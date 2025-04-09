import { Server } from "socket.io";
import { pub, sub } from "./resdisPubSub";
import { createAdapter } from "@socket.io/redis-adapter";

const CHANNEL_CHAT = "chat";
const CHANNEL_PRIVATE = "privateChat";
const rooms: Record<string, Set<string>> = {}; // Store rooms with connected user IDs

interface RoomData {
  roomname: string;
  message: string;
}

interface ChatMessage {
  room: string;
  message: string;
  senderId: string;
}

interface PrivateMessage {
  to: string;
  message: string;
  from: string;
}

let io:Server;
export const initializeSocket = (httpServer: any) => {
  console.log("Initializing Socket.io...");
  
  io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  // manually subscribe to redis chat and private channels
  // sub.subscribe(CHANNEL_CHAT);
  // sub.subscribe(CHANNEL_PRIVATE);

  // ths is Redis Adapter automatically pulish and subscribes to the channels:
  io.adapter(createAdapter(pub, sub));

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Listen for messages from Redis mannualy
    // sub.on("message", (channel, message) => {
    //   const parsedMessage = JSON.parse(message);
    //   console.log(`Received message on ${channel}:`, parsedMessage);

    //   if (channel === CHANNEL_CHAT) {
    //     io.to(parsedMessage.room).emit("chat-message", parsedMessage);
    //   } else if (channel === CHANNEL_PRIVATE) {
    //     io.to(parsedMessage.to).emit("privateMessage", parsedMessage);
    //   }
    // });

    // Join a project room and send a message
    socket.on("joinRoom", async (data: RoomData) => {
      socket.join(data.roomname);
      if (!rooms[data.roomname]) {
        rooms[data.roomname] = new Set();
      }
      rooms[data.roomname].add(socket.id);

      console.log(`${socket.id} joined room: ${data.roomname}`);

      const payload: ChatMessage = {
        room: data.roomname,
        message: data.message,
        senderId: socket.id,
      };

      // await pub.publish(CHANNEL_CHAT, JSON.stringify(payload)); //manually publish to redis
    });

    // Send a project message
    socket.on("chat-message", async (data: ChatMessage) => {
      console.log("Project Chat Message:", data);

      // await pub.publish(CHANNEL_CHAT, JSON.stringify(data)); // manually publish to redis
    });

    // Send a personal message
    socket.on("privateMessage", async (data: PrivateMessage) => {
      console.log("Private Message:", data);

      // await pub.publish(CHANNEL_PRIVATE, JSON.stringify(data)); // manually publish to redis
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      for (const room in rooms) {
        rooms[room].delete(socket.id);
        if (rooms[room].size === 0) {
          delete rooms[room];
        }
      }
    });
  });

  return io;
};

export const getSocketServer = () => io;