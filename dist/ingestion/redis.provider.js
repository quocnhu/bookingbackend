"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisProvider = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_constants_1 = require("../common/redis/redis.constants");
const logger = new common_1.Logger('RedisProvider');
exports.redisProvider = {
    provide: redis_constants_1.REDIS_CLIENT,
    useFactory: () => {
        const client = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
            lazyConnect: true,
            maxRetriesPerRequest: 2,
            enableOfflineQueue: false,
            retryStrategy: (times) => Math.min(times * 500, 5000),
        });
        client.on('error', (err) => logger.warn(`Redis unavailable: ${err.message}`));
        client.on('connect', () => logger.log('Redis connected'));
        client.connect().catch(() => {
        });
        return client;
    },
};
//# sourceMappingURL=redis.provider.js.map