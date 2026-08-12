export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_SUBSCRIBER = 'REDIS_SUBSCRIBER';

// TTL cho claim chống trùng ở mức message (7 ngày) — bắt redeliver Pub/Sub.
export const DEDUP_TTL_SECONDS = 7 * 24 * 60 * 60;

export const dedupKey = (messageId: string) => `dedup:msg:${messageId}`;
export const historyCheckpointKey = (email: string) =>
  `gmail:history-checkpoint:${email}`;
