// import Redis from "ioredis";

// export const pub = new Redis({
//   host: 'valkey-1560c66d-scalable-chat-app-node.d.aivencloud.com',
//   port: 17720,
//   username: 'default',
//   password: 'AVNS_N5QWjYiN1YIBmeQ6lRO',
// });

// export const sub = new Redis({
//   host: 'valkey-1560c66d-scalable-chat-app-node.d.aivencloud.com',
//   port: 17720,
//   username: 'default',
//   password: 'AVNS_N5QWjYiN1YIBmeQ6lRO',
// });

import Redis from "ioredis";

const redisConfig = {
  host: 'valkey-1560c66d-scalable-chat-app-node.d.aivencloud.com',
  port: 17720,
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 1,
  retryStrategy: (times: number) => {
    return Math.min(times * 50, 2000);
  }
};

export const pub = new Redis(redisConfig);
export const sub = new Redis(redisConfig);

// Handle Redis connection errors
pub.on('error', (err) => console.error('Redis Publisher Error:', err));
sub.on('error', (err) => console.error('Redis Subscriber Error:', err));
