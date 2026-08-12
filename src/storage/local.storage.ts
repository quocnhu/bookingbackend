import * as fsp from 'fs/promises';
import * as path from 'path';
import { FileStorage, StorageEntry } from './storage.types';

/**
 * Driver mặc định khi chưa cấu hình cloud: lưu vào backend/uploads,
 * phục vụ qua ServeStaticModule tại http://localhost:4000/uploads.
 */
export class LocalStorage implements FileStorage {
  readonly driver = 'local' as const;

  private readonly root = path.join(process.cwd(), 'uploads');
  private readonly publicBase =
    process.env.PUBLIC_UPLOADS_BASE || 'http://localhost:4000/uploads';

  async save(key: string, buffer: Buffer) {
    const abs = path.join(this.root, key);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, buffer);
    return { key, url: this.url(key) };
  }

  async remove(key: string) {
    try {
      await fsp.unlink(path.join(this.root, key));
    } catch {
      // file không tồn tại — bỏ qua
    }
  }

  async list(prefix: string): Promise<StorageEntry[]> {
    const dir = path.join(this.root, prefix);
    let entries: import('fs').Dirent[];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    const files: StorageEntry[] = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const key = path.join(prefix, entry.name).split(path.sep).join('/');
      files.push({ key, url: this.url(key) });
    }
    return files;
  }

  async rename(fromKey: string, toKey: string) {
    const from = path.join(this.root, fromKey);
    const to = path.join(this.root, toKey);
    await fsp.mkdir(path.dirname(to), { recursive: true });
    await fsp.rename(from, to);
  }

  url(key: string) {
    return `${this.publicBase}/${key}`;
  }
}
