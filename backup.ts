import express, { Express, Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import userRoutes from "./routes/userRoutes";
import cookieParser from "cookie-parser";
import Redis from "ioredis";

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Create HTTP server with express instance
const httpServer = createServer(app);

//create redis publisher with aiven credentials
const pub = new Redis({
  host: 'valkey-1560c66d-scalable-chat-app-node.d.aivencloud.com',
  port: 17720,
  username: 'default',
  password: 'AVNS_N5QWjYiN1YIBmeQ6lRO',
});
//create redis subscriber with aiven credentials
const sub = new Redis({
  host: 'valkey-1560c66d-scalable-chat-app-node.d.aivencloud.com',
  port: 17720,
  username: 'default',
  password: 'AVNS_N5QWjYiN1YIBmeQ6lRO',
});

const channel = "chat";

app.get("/", (req: Request, res: Response) => {
  res.sendFile(__dirname + '/index.html');
})

// Routes
app.use('/auth', userRoutes);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

sub.subscribe("chat");

const rooms: Record<string, string[]> = {};

app.get("/allrooms", (req: Request, res: Response) => {
  console.log(rooms.length)
  res.send(rooms);
})

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  sub.on('message',(channel,message)=>{
    console.log(message,"message", channel);
    if(channel=="chat"){
      // io.emit(message);
      io.emit("privateMessage", message);
      // io.emit("chat-message", message);
    }
  })
  // Join a room
  socket.on('joinRoom', async(room: { roomname:string, message:string}) => {
    socket.join(room.roomname);
    if (!rooms[room.roomname]) {
      rooms[room.roomname] = [];
    }
    rooms[room.roomname].push(socket.id);
    rooms[room.roomname].push(room.message);
    console.log(`${socket.id} joined room: ${room.roomname} with message ${room.message}`);
    await pub.publish(channel, JSON.stringify({
      room: room.roomname,  
      message: room.message
    }))
  });

  // Handle chat message
  socket.on('chat-message', (data: { room: string, message: string }) => {
    console.log(data)
    io.emit("chat-message", data);
  });

  // Handle 1-to-1 private message
  socket.on('privateMessage', (data: { to: string, message: string }) => {
    io.to(data.to).emit('privateMessage', {
      from: socket.id,
      message: data.message,
    });
    io.emit("privateMessage", data);
    console.log(data)
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    // Clean up user from rooms
    for (const room in rooms) {
      rooms[room] = rooms[room].filter((id) => id !== socket.id);
    }
  });
});


httpServer.listen(3001, () => {
  console.log('Server is running on port 3001');
});
