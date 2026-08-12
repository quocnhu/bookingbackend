import {
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { FileStorage, StorageEntry } from './storage.types';

export interface S3StorageConfig {
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
  publicUrl?: string;
}

/**
 * Driver cloud (S3 / S3-compatible: AWS, MinIO, R2, Wasabi...).
 * Key = storageKey hiện tại (drive/{userDir}/{folderId}/file) — giữ nguyên logic,
 * chỉ đổi nơi lưu trữ.
 */
export class S3Storage implements FileStorage {
  readonly driver = 's3' as const;

  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly publicBase?: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.region = config.region || 'us-east-1';
    this.publicBase = config.publicUrl
      ? config.publicUrl.replace(/\/+$/, '')
      : undefined;
    this.client = new S3Client({
      region: this.region,
      endpoint: config.endpoint || undefined,
      forcePathStyle: config.forcePathStyle,
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined,
    });
  }

  async save(key: string, buffer: Buffer, opts?: { contentType?: string }) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: opts?.contentType,
      }),
    );
    return { key, url: this.url(key) };
  }

  async remove(key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async list(prefix: string): Promise<StorageEntry[]> {
    const out: StorageEntry[] = [];
    let token: string | undefined;
    do {
      const res = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      );
      for (const obj of res.Contents ?? []) {
        if (!obj.Key || obj.Key.endsWith('/')) continue;
        out.push({ key: obj.Key, url: this.url(obj.Key) });
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return out;
  }

  async rename(fromKey: string, toKey: string) {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: toKey,
        CopySource: `/${this.bucket}/${fromKey}`,
      }),
    );
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: fromKey }),
    );
  }

  url(key: string) {
    if (this.publicBase) return `${this.publicBase}/${key}`;
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
