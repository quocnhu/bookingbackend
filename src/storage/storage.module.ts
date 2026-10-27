import { Global, Module } from '@nestjs/common';
import { FileStorage, STORAGE } from './storage.types';
import { LocalStorage } from './local.storage';
import { S3Storage, S3StorageConfig } from './s3.storage';

function supabaseConfig(): S3StorageConfig {
  const base = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  if (!base) {
    throw new Error('STORAGE_DRIVER=supabase requires SUPABASE_URL to be set');
  }
  const bucket =
    (process.env.SUPABASE_STORAGE_BUCKET || '').trim() || 'booking';
  const accessKeyId =
    process.env.SUPABASE_S3_ACCESS_KEY_ID ||
    process.env.SUPABASE_ACCESS_KEY_ID ||
    process.env.SUPABASE_ACCESS_KEY;
  const secretAccessKey =
    process.env.SUPABASE_S3_SECRET_ACCESS_KEY ||
    process.env.SUPABASE_SECRET_ACCESS_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  return {
    bucket,
    region: process.env.SUPABASE_REGION || 'us-east-1',
    endpoint: process.env.SUPABASE_S3_ENDPOINT || `${base}/storage/v1/s3`,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: process.env.SUPABASE_FORCE_PATH_STYLE !== 'false',
    publicUrl:
      process.env.SUPABASE_PUBLIC_URL ||
      `${base}/storage/v1/object/public/${bucket}`,
    driver: 'supabase',
  };
}

function s3Config(): S3StorageConfig {
  return {
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    publicUrl: process.env.S3_PUBLIC_URL || undefined,
    driver: 's3',
  };
}

function hasS3Config(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY,
  );
}

function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_S3_ACCESS_KEY_ID ||
      process.env.SUPABASE_ACCESS_KEY_ID ||
      process.env.SUPABASE_ACCESS_KEY) &&
    (process.env.SUPABASE_S3_SECRET_ACCESS_KEY ||
      process.env.SUPABASE_SECRET_ACCESS_KEY ||
      process.env.SUPABASE_SECRET_KEY),
  );
}

function createFileStorage(): FileStorage {
  const driver = (process.env.STORAGE_DRIVER || '').trim().toLowerCase();

  if (driver === 'local') {
    return new LocalStorage();
  }
  if (driver === 's3') {
    return new S3Storage(s3Config());
  }
  if (driver === 'supabase') {
    return new S3Storage(supabaseConfig());
  }
  if (hasSupabaseConfig()) {
    return new S3Storage(supabaseConfig());
  }
  if (hasS3Config()) {
    return new S3Storage(s3Config());
  }
  return new LocalStorage();
}

@Global()
@Module({
  providers: [{ provide: STORAGE, useFactory: createFileStorage }],
  exports: [STORAGE],
})
export class StorageModule {}
