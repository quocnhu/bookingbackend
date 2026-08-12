"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
let CacheService = CacheService_1 = class CacheService {
    logger = new common_1.Logger(CacheService_1.name);
    client = null;
    async onModuleInit() {
        try {
            this.client = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
                lazyConnect: true,
                maxRetriesPerRequest: 2,
                enableOfflineQueue: false,
            });
            await this.client.connect();
            this.logger.log('Redis cache connected');
        }
        catch (err) {
            this.logger.warn(`Redis cache unavailable: ${err.message}`);
            this.client = null;
        }
    }
    async onModuleDestroy() {
        if (this.client) {
            try {
                this.client.disconnect();
            }
            catch {
            }
        }
    }
    key(namespace, id) {
        return `cache:${namespace}:${id}`;
    }
    async get(namespace, id) {
        if (!this.client)
            return null;
        try {
            const raw = await this.client.get(this.key(namespace, id));
            return raw ? JSON.parse(raw) : null;
        }
        catch (err) {
            this.logger.debug(`cache get miss ${namespace}:${id} — ${err.message}`);
            return null;
        }
    }
    async set(namespace, id, value, ttlSeconds = 60) {
        if (!this.client)
            return;
        try {
            await this.client.set(this.key(namespace, id), JSON.stringify(value), 'EX', ttlSeconds);
        }
        catch (err) {
            this.logger.debug(`cache set failed ${namespace}:${id} — ${err.message}`);
        }
    }
    async del(namespace, id) {
        if (!this.client)
            return;
        try {
            await this.client.del(this.key(namespace, id));
        }
        catch (err) {
            this.logger.debug(`cache del failed ${namespace}:${id} — ${err.message}`);
        }
    }
    async invalidate(namespace) {
        if (!this.client)
            return;
        try {
            const stream = this.client.scanStream({ match: `cache:${namespace}:*`, count: 100 });
            const pipeline = this.client.pipeline();
            await new Promise((resolve, reject) => {
                stream.on('data', (keys) => {
                    if (keys.length)
                        pipeline.del(...keys);
                });
                stream.on('end', async () => {
                    try {
                        await pipeline.exec();
                        resolve();
                    }
                    catch (e) {
                        reject(e);
                    }
                });
                stream.on('error', reject);
            });
        }
        catch (err) {
            this.logger.debug(`cache invalidate failed ${namespace} — ${err.message}`);
        }
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)()
], CacheService);
//# sourceMappingURL=cache.service.js.map