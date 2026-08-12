export const STORAGE = 'FILE_STORAGE';

export interface StorageEntry {
  key: string;
  url: string;
}

export interface FileStorage {
  readonly driver: 'local' | 's3';

  save(
    key: string,
    buffer: Buffer,
    opts?: { contentType?: string },
  ): Promise<{ key: string; url: string }>;

  remove(key: string): Promise<void>;

  url(key: string): string;

  /** Liệt kê mọi file dưới một prefix (thư mục). */
  list(prefix: string): Promise<StorageEntry[]>;

  /** Đổi tên / di chuyển một file. */
  rename(fromKey: string, toKey: string): Promise<void>;
}
