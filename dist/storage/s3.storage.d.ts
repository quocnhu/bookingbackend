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
export declare class S3Storage implements FileStorage {
    readonly driver: "s3";
    private readonly client;
    private readonly bucket;
    private readonly region;
    private readonly publicBase?;
    constructor(config: S3StorageConfig);
    save(key: string, buffer: Buffer, opts?: {
        contentType?: string;
    }): Promise<{
        key: string;
        url: string;
    }>;
    remove(key: string): Promise<void>;
    list(prefix: string): Promise<StorageEntry[]>;
    rename(fromKey: string, toKey: string): Promise<void>;
    url(key: string): string;
}
