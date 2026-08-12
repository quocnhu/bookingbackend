import { Logger, Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/redis/redis.constants';

const logger = new Logger('RedisProvider');

/**
 * Redis client dùng chung cho ingestion (dedup claim + history checkpoint).
 * Lazy connect + retry bền bỉ: Redis sập không làm crash app.
 */
export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (): Redis => {
    const client = new Redis(
      process.env.REDIS_URL || 'redis://localhost:6379',
      {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
        retryStrategy: (times: number) => Math.min(times * 500, 5000),
      },
    );
    client.on('error', (err) =>
      logger.warn(`Redis unavailable: ${err.message}`),
    );
    client.on('connect', () => logger.log('Redis connected'));
    client.connect().catch(() => {
      /* best-effort — BullMQ/BullMQ already own their own connections */
    });
    return client;
  },
};
