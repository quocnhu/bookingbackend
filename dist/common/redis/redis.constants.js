"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.historyCheckpointKey = exports.dedupKey = exports.DEDUP_TTL_SECONDS = exports.REDIS_SUBSCRIBER = exports.REDIS_CLIENT = void 0;
exports.REDIS_CLIENT = 'REDIS_CLIENT';
exports.REDIS_SUBSCRIBER = 'REDIS_SUBSCRIBER';
exports.DEDUP_TTL_SECONDS = 7 * 24 * 60 * 60;
const dedupKey = (messageId) => `dedup:msg:${messageId}`;
exports.dedupKey = dedupKey;
const historyCheckpointKey = (email) => `gmail:history-checkpoint:${email}`;
exports.historyCheckpointKey = historyCheckpointKey;
//# sourceMappingURL=redis.constants.js.map