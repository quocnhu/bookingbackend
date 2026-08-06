import { FileStorage } from './storage.types';
export declare class LocalStorage implements FileStorage {
    readonly driver: "local";
    private readonly root;
    private readonly publicBase;
    save(key: string, buffer: Buffer): Promise<{
        key: string;
        url: string;
    }>;
    remove(key: string): Promise<void>;
    url(key: string): string;
}
