import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
export declare class CacheService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private client;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private key;
    get<T>(namespace: string, id: string): Promise<T | null>;
    set(namespace: string, id: string, value: unknown, ttlSeconds?: number): Promise<void>;
    del(namespace: string, id: string): Promise<void>;
    invalidate(namespace: string): Promise<void>;
}
