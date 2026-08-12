import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Thin Redis cache shared with the BullMQ connection (same REDIS_URL).
 * All reads/writes are best-effort: a Redis failure never breaks the API.
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;

  async onModuleInit() {
    try {
      this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
      });
      await this.client.connect();
      this.logger.log('Redis cache connected');
    } catch (err) {
      this.logger.warn(`Redis cache unavailable: ${(err as Error).message}`);
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        this.client.disconnect();
      } catch {
        /* noop */
      }
    }
  }

  private key(namespace: string, id: string) {
    return `cache:${namespace}:${id}`;
  }

  /** Read a JSON value. Returns null on miss or on Redis failure. */
  async get<T>(namespace: string, id: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(this.key(namespace, id));
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.logger.debug(`cache get miss ${namespace}:${id} — ${(err as Error).message}`);
      return null;
    }
  }

  /** Store a JSON value with a TTL in seconds. */
  async set(namespace: string, id: string, value: unknown, ttlSeconds = 60): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(this.key(namespace, id), JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.debug(`cache set failed ${namespace}:${id} — ${(err as Error).message}`);
    }
  }

  /** Delete one key. */
  async del(namespace: string, id: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(this.key(namespace, id));
    } catch (err) {
      this.logger.debug(`cache del failed ${namespace}:${id} — ${(err as Error).message}`);
    }
  }

  /** Delete every key under a namespace (e.g. all booking lists). */
  async invalidate(namespace: string): Promise<void> {
    if (!this.client) return;
    try {
      const stream = this.client.scanStream({ match: `cache:${namespace}:*`, count: 100 });
      const pipeline = this.client.pipeline();
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (keys: string[]) => {
          if (keys.length) pipeline.del(...keys);
        });
        stream.on('end', async () => {
          try {
            await pipeline.exec();
            resolve();
          } catch (e) {
            reject(e);
          }
        });
        stream.on('error', reject);
      });
    } catch (err) {
      this.logger.debug(`cache invalidate failed ${namespace} — ${(err as Error).message}`);
    }
  }
}
