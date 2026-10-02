import { FileStorage, StorageEntry } from './storage.types';
export declare class LocalStorage implements FileStorage {
    readonly driver: "local";
    private readonly root;
    private readonly publicBase;
    private resolveSafe;
    save(key: string, buffer: Buffer): Promise<{
        key: string;
        url: string;
    }>;
    remove(key: string): Promise<void>;
    list(prefix: string): Promise<StorageEntry[]>;
    rename(fromKey: string, toKey: string): Promise<void>;
    url(key: string): string;
}
