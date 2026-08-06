import { Global, Module } from '@nestjs/common';
import { FileStorage, STORAGE } from './storage.types';
import { LocalStorage } from './local.storage';
import { S3Storage } from './s3.storage';

/**
 * Chọn driver lưu trữ từ env:
 * - STORAGE_DRIVER=s3            -> luôn dùng cloud
 * - STORAGE_DRIVER=local         -> luôn dùng local
 * - STORAGE_DRIVER trống         -> tự động: đủ S3_BUCKET + S3_ACCESS_KEY + S3_SECRET_KEY
 *                                    thì dùng cloud, ngược lại local (test).
 */
function createFileStorage(): FileStorage {
  const driver = (process.env.STORAGE_DRIVER || '').trim().toLowerCase();
  const hasS3 = Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY,
  );
  const useS3 = driver === 's3' || (driver !== 'local' && hasS3);
  if (useS3) {
    return new S3Storage({
      bucket: process.env.S3_BUCKET!,
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      publicUrl: process.env.S3_PUBLIC_URL || undefined,
    });
  }
  return new LocalStorage();
}

@Global()
@Module({
  providers: [{ provide: STORAGE, useFactory: createFileStorage }],
  exports: [STORAGE],
})
export class StorageModule {}
