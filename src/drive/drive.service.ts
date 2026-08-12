import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { DriveFolder } from '@prisma/client';
import sharp from 'sharp';
import { PrismaService } from '@/prisma/prisma.service';
import { STORAGE } from '@/storage';
import type { FileStorage } from '@/storage';
import {
  CreateFolderDto,
  RenameFileDto,
  RenameFolderDto,
} from './dto/drive.dto';

export const AVATAR_SIZE = 515;
export const DEFAULT_QUOTA_MB = 3072; // 3 GB cho mọi user không phải ADMIN
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB / file (non-ADMIN)
const MB = 1024 * 1024;

export interface DriveFileView {
  id: string;
  userId: string | null;
  folderId: string;
  name: string;
  mimeType: string | null;
  size: number;
  storageKey: string;
  createdAt: Date;
  url: string;
}

@Injectable()
export class DriveService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE) private readonly storage: FileStorage,
  ) {}

  /**
   * Tạo root "{slug}_{userId}" + thư mục "avatar" nếu chưa có (idempotent).
   * Được gọi mỗi lần user đăng nhập/đăng ký.
   */
  async ensureUserDrive(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    const slug = this.userSlug(user?.email, user?.name, userId);
    const rootName = `${slug}_${userId}`;

    let root = await this.prisma.driveFolder.findFirst({
      where: { userId, parentId: null, kind: 'root' },
    });
    if (!root) {
      root = await this.prisma.driveFolder.create({
        data: { userId, name: rootName, kind: 'root' },
      });
    } else if (root.name !== rootName) {
      // upgrade: giữ tên luôn khớp định dạng {slug}_{uuid}
      root = await this.prisma.driveFolder.update({
        where: { id: root.id },
        data: { name: rootName },
      });
    }
    let avatar = await this.prisma.driveFolder.findFirst({
      where: { userId, parentId: root.id, kind: 'avatar' },
    });
    if (!avatar) {
      avatar = await this.prisma.driveFolder.create({
        data: { userId, parentId: root.id, name: 'avatar', kind: 'avatar' },
      });
    }
    return { root, avatar };
  }

  async listContents(userId: string, folderId?: string) {
    let current: DriveFolder | null = null;
    let parentId: string | null = null;

    if (folderId) {
      current = await this.prisma.driveFolder.findFirst({
        where: { id: folderId, userId },
      });
      if (!current) {
        throw new NotFoundException('Folder not found');
      }
      parentId = current.id;
    } else {
      const drive = await this.ensureUserDrive(userId);
      parentId = drive.root.id;
    }

    const [folders, files] = await Promise.all([
      this.prisma.driveFolder.findMany({
        where: { userId, parentId },
        orderBy: [{ kind: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.driveFile.findMany({
        where: { userId, folderId: parentId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      current,
      breadcrumb: await this.buildBreadcrumb(userId, folderId),
      folders,
      files: files.map((f) => ({ ...f, url: this.storage.url(f.storageKey) })),
      quota: await this.quotaInfo(userId),
    };
  }

  async createFolder(userId: string, dto: CreateFolderDto) {
    const targetId =
      dto.parentId ?? (await this.ensureUserDrive(userId)).root.id;
    await this.assertFolderAccess(userId, targetId);
    return this.prisma.driveFolder.create({
      data: { userId, parentId: targetId, name: dto.name.trim(), kind: 'folder' },
    });
  }

  async renameFolder(userId: string, id: string, dto: RenameFolderDto) {
    const folder = await this.assertFolderAccess(userId, id);
    if (folder.kind !== 'folder') {
      throw new BadRequestException('Root and avatar folders cannot be renamed');
    }
    return this.prisma.driveFolder.update({
      where: { id },
      data: { name: dto.name.trim() },
    });
  }

  async deleteFolder(userId: string, id: string) {
    const folder = await this.assertFolderAccess(userId, id);
    if (folder.kind !== 'folder') {
      throw new BadRequestException('Root and avatar folders cannot be deleted');
    }
    const keys = await this.collectFileKeys(userId, id);
    for (const key of keys) {
      await this.storage.remove(key);
    }
    await this.prisma.driveFolder.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Điểm vào chung cho avatar: profile page (self) và users page (ADMIN thay user khác)
   * đều dùng endpoint này -> cùng logic xử lý ảnh, cùng nơi lưu, cùng cập nhật avatarUrl.
   */
  async uploadAvatar(
    actor: { id: string; role: string },
    file: Express.Multer.File,
    targetUserId?: string,
  ) {
    let uid = actor.id;
    if (targetUserId && targetUserId !== actor.id) {
      if (actor.role !== 'ADMIN') {
        throw new BadRequestException('You can only update your own avatar');
      }
      uid = targetUserId;
    }
    const { avatar } = await this.ensureUserDrive(uid);
    return this.uploadFile(uid, file, avatar.id);
  }

  async uploadFile(
    userId: string,
    file: Express.Multer.File,
    folderId?: string,
    clientName?: string,
  ): Promise<DriveFileView> {
    if (!file?.buffer) {
      throw new BadRequestException('No file uploaded');
    }
    const targetId =
      folderId ?? (await this.ensureUserDrive(userId)).root.id;
    const folder = await this.assertFolderAccess(userId, targetId);

    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    const isAvatar = folder.kind === 'avatar';

    // Avatar: tự động resize/crop về chuẩn 515x515 rồi mới lưu.
    let buffer = file.buffer;
    let mime = file.mimetype || null;
    let finalExt = ext;
    if (isAvatar) {
      const processed = await this.processAvatar(file);
      buffer = processed.buffer;
      mime = processed.mimeType;
      finalExt = processed.ext;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, role: true, storageQuotaMb: true },
    });
    const userDir = `${this.userSlug(user?.email, user?.name, userId)}_${userId}`;

    if (user?.role !== 'ADMIN') {
      if (buffer.length > MAX_UPLOAD_BYTES) {
        throw new BadRequestException(
          `Max upload size is ${this.formatBytes(MAX_UPLOAD_BYTES)} per file`,
        );
      }
      const quotaBytes = (user?.storageQuotaMb ?? DEFAULT_QUOTA_MB) * MB;
      const used = await this.usedBytes(userId);
      let replacing = 0;
      if (isAvatar) {
        const old = await this.prisma.driveFile.findMany({
          where: { userId, folderId: targetId },
          select: { size: true },
        });
        replacing = old.reduce((s, o) => s + o.size, 0);
      }
      if (used - replacing + buffer.length > quotaBytes) {
        throw new BadRequestException(
          `Storage quota exceeded (limit ${this.formatBytes(quotaBytes)})`,
        );
      }
    }

    const baseName = (clientName || file.originalname || `file.${ext || 'bin'}`)
      .split('/')
      .pop()!
      .replace(/[^\w.\- ]/g, '_');
    const finalName = isAvatar ? `avatar.${finalExt}` : baseName;
    const storedName = isAvatar ? finalName : `${Date.now()}-${finalName}`;

    const storageKey = `drive/${userDir}/${targetId}/${storedName}`;

    if (isAvatar) {
      // folder-based: xoá mọi ảnh avatar cũ trong folder trước khi ghi ảnh mới.
      // Vì ảnh mới luôn trùng tên avatar.{ext}, xoá sau khi save sẽ xoá cả ảnh mới.
      const oldFiles = await this.storage.list(`drive/${userDir}/${targetId}/`);
      for (const f of oldFiles) {
        await this.storage.remove(f.key);
      }
      await this.prisma.driveFile.deleteMany({
        where: { userId, folderId: targetId },
      });
    }

    await this.storage.save(storageKey, buffer, {
      contentType: mime || undefined,
    });

    const saved = await this.prisma.driveFile.create({
      data: {
        userId,
        folderId: targetId,
        name: finalName,
        mimeType: mime,
        size: buffer.length,
        storageKey,
      },
    });

    if (isAvatar) {
      const avatarUrl = `${this.storage.url(storageKey)}?v=${Date.now()}`;
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
      });
      // trả url kèm version để trình duyệt không cache ảnh cũ
      return { ...saved, url: avatarUrl };
    }

    return { ...saved, url: this.storage.url(storageKey) };
  }

  async renameFile(userId: string, id: string, dto: RenameFileDto) {
    const file = await this.prisma.driveFile.findFirst({
      where: { id, userId },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    const folder = await this.prisma.driveFolder.findUnique({
      where: { id: file.folderId },
    });
    if (folder?.kind === 'avatar') {
      throw new BadRequestException('Avatar files cannot be renamed');
    }
    const name = dto.name.replace(/[^\w.\- ]/g, '_');
    return this.prisma.driveFile.update({ where: { id }, data: { name } });
  }

  async deleteFile(userId: string, id: string) {
    const file = await this.prisma.driveFile.findFirst({
      where: { id, userId },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    await this.storage.remove(file.storageKey);
    await this.prisma.driveFile.delete({ where: { id } });
    return { success: true };
  }

  private async assertFolderAccess(userId: string, folderId: string) {
    const folder = await this.prisma.driveFolder.findFirst({
      where: { id: folderId, userId },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    return folder;
  }

  private async buildBreadcrumb(userId: string, folderId?: string) {
    const root = await this.prisma.driveFolder.findFirst({
      where: { userId, parentId: null, kind: 'root' },
    });
    const items: { id: string | null; name: string }[] = [];
    if (root) items.push({ id: null, name: root.name });
    if (!folderId) return items;
    let current = await this.prisma.driveFolder.findUnique({
      where: { id: folderId },
    });
    while (current && current.userId === userId && current.kind !== 'root') {
      items.push({ id: current.id, name: current.name });
      current = current.parentId
        ? await this.prisma.driveFolder.findUnique({
            where: { id: current.parentId },
          })
        : null;
    }
    return items;
  }

  private async collectFileKeys(userId: string, folderId: string) {
    const keys: string[] = [];
    const walk = async (fid: string) => {
      const files = await this.prisma.driveFile.findMany({
        where: { userId, folderId: fid },
        select: { storageKey: true },
      });
      keys.push(...files.map((f) => f.storageKey));
      const subs = await this.prisma.driveFolder.findMany({
        where: { userId, parentId: fid },
      });
      for (const s of subs) await walk(s.id);
    };
    await walk(folderId);
    return keys;
  }

  /**
   * Tự động chuẩn hoá ảnh avatar về đúng 515x515 (cover-crop, giữ EXIF orientation),
   * chấp nhận ảnh bất kỳ kích thước. Chỉ nhận PNG/JPG.
   */
  private async processAvatar(file: Express.Multer.File) {
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    const allowed = ['png', 'jpg', 'jpeg'];
    if (!allowed.includes(ext) || !['image/png', 'image/jpeg'].includes(mime)) {
      throw new BadRequestException(
        `Avatar only allows PNG or JPG files (got .${ext || 'unknown'})`,
      );
    }
    const isPng = ext === 'png';
    try {
      const pipeline = sharp(file.buffer, { failOn: 'none' })
        .rotate()
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' });
      const buffer = await (isPng
        ? pipeline.png({ quality: 95 })
        : pipeline.jpeg({ quality: 90 })
      ).toBuffer();
      return {
        buffer,
        mimeType: isPng ? 'image/png' : 'image/jpeg',
        ext: isPng ? 'png' : 'jpg',
      };
    } catch {
      throw new BadRequestException(
        'Could not process the image. Please upload a valid PNG or JPG picture.',
      );
    }
  }

  private userSlug(
    email?: string | null,
    name?: string | null,
    fallback?: string,
  ) {
    const raw = email?.split('@')[0] || name || fallback || 'user';
    const slug = raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return slug || fallback || 'user';
  }

  private async usedBytes(userId: string): Promise<number> {
    const agg = await this.prisma.driveFile.aggregate({
      where: { userId },
      _sum: { size: true },
    });
    return agg._sum.size ?? 0;
  }

  private async quotaInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, storageQuotaMb: true },
    });
    const usedBytes = await this.usedBytes(userId);
    if (user?.role === 'ADMIN') {
      return {
        unlimited: true,
        quotaBytes: null,
        usedBytes,
        freeBytes: null,
        usedPercent: 0,
        maxUploadBytes: null,
      };
    }
    const quotaBytes = (user?.storageQuotaMb ?? DEFAULT_QUOTA_MB) * MB;
    return {
      unlimited: false,
      quotaBytes,
      usedBytes,
      freeBytes: Math.max(0, quotaBytes - usedBytes),
      usedPercent: Math.min(100, Math.round((usedBytes / quotaBytes) * 100)),
      maxUploadBytes: MAX_UPLOAD_BYTES,
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes >= 1024 * MB) return `${(bytes / (1024 * MB)).toFixed(1)} GB`;
    if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  }
}
