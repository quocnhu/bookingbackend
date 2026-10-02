import * as fsp from 'fs/promises';
import * as path from 'path';
import { FileStorage, StorageEntry } from './storage.types';

/**
 * Default driver when no cloud is configured: stores files in backend/uploads,
 * served through ServeStaticModule at http://localhost:4000/uploads.
 */
export class LocalStorage implements FileStorage {
  readonly driver = 'local' as const;

  private readonly root = path.join(process.cwd(), 'uploads');
  private readonly publicBase =
    process.env.PUBLIC_UPLOADS_BASE || 'http://localhost:4000/uploads';

  private resolveSafe(key: string): string {
    const abs = path.resolve(this.root, key);
    const rootResolved = path.resolve(this.root);
    if (!abs.startsWith(rootResolved + path.sep) && abs !== rootResolved) {
      throw new Error('Path traversal attempt blocked');
    }
    return abs;
  }

  async save(key: string, buffer: Buffer) {
    const abs = this.resolveSafe(key);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, buffer);
    return { key, url: this.url(key) };
  }

  async remove(key: string) {
    try {
      await fsp.unlink(this.resolveSafe(key));
    } catch {
      // file does not exist — skip
    }
  }

  async list(prefix: string): Promise<StorageEntry[]> {
    const dir = this.resolveSafe(prefix);
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
    const from = this.resolveSafe(fromKey);
    const to = this.resolveSafe(toKey);
    await fsp.mkdir(path.dirname(to), { recursive: true });
    await fsp.rename(from, to);
  }

  url(key: string) {
    return `${this.publicBase}/${key}`;
  }
}
