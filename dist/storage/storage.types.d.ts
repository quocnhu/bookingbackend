export declare const STORAGE = "FILE_STORAGE";
export interface StorageEntry {
    key: string;
    url: string;
}
export interface FileStorage {
    readonly driver: 'local' | 's3';
    save(key: string, buffer: Buffer, opts?: {
        contentType?: string;
    }): Promise<{
        key: string;
        url: string;
    }>;
    remove(key: string): Promise<void>;
    url(key: string): string;
    list(prefix: string): Promise<StorageEntry[]>;
    rename(fromKey: string, toKey: string): Promise<void>;
}
