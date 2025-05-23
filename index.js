import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*', // replace with your frontend domain in prod
    methods: ['GET', 'POST'],
  },
});

const redis = new Redis(process.env.REDIS_URL);

io.on('connection', (socket) => {
  console.log(`🔌 ${socket.id} connected`);

  let userId;

  socket.on('join', (id) => {
    userId = id;
    socket.join(`user:${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ ${socket.id} disconnected`);
    clearInterval(socket._pushInterval);
  });

  // Backend pushes every 10 seconds (adjust as needed)
  socket._pushInterval = setInterval(async () => {
    if (userId) {
      const count = await redis.get(`notifications:unread:${userId}`) || 0;
      io.to(`user:${userId}`).emit('notification:summary', {
        unreadCount: parseInt(count),
      });
    }
  }, 10000);
});
server.listen(4000, () => {
  console.log('WebSocket server running on port 4000');
});
