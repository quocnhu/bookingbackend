import * as fsp from 'fs/promises';
import * as path from 'path';
import { FileStorage } from './storage.types';

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

  url(key: string) {
    return `${this.publicBase}/${key}`;
  }
}
