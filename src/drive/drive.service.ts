import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { DriveFolder, Prisma } from '@prisma/client';
import sharp from 'sharp';
import { PrismaService } from '@/prisma/prisma.service';
import { STORAGE } from '@/storage';
import type { FileStorage } from '@/storage';
import {
  CreateFolderDto,
  RenameFileDto,
  RenameFolderDto,
} from './dto/drive.dto';
import {
  validateFile,
  sanitizeFileName,
  ALLOWED_AVATAR_TYPES,
  MAX_AVATAR_SIZE,
} from '@/common/utils/file-validation.util';
import {
  formatDateKey,
  pendingEvidencePrefix,
  storagePathSegment,
  tourFolderName,
  userStorageDir,
} from '@/common/utils/storage-key.util';

export const AVATAR_SIZE = 515;
export const DEFAULT_QUOTA_MB = 3072; // 3 GB for every non-ADMIN user
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

interface ReportEvidenceImage {
  name?: string | null;
  url?: string | null;
  ext?: string | null;
  storageKey?: string | null;
  size?: number | null;
  mimeType?: string | null;
  uploadedAt?: string | null;
  uploadedByName?: string | null;
  [key: string]: unknown;
}

@Injectable()
export class DriveService {
  private readonly logger = new Logger(DriveService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE) private readonly storage: FileStorage,
  ) {}

  private formatDateKey(date: Date | string = new Date()): string {
    return formatDateKey(date);
  }

  private async ensureChildFolder(
    userId: string,
    parentId: string,
    name: string,
    kind = 'folder',
  ) {
    const existing = await this.prisma.driveFolder.findFirst({
      where: { userId, parentId, name },
    });
    if (existing) return existing;
    return this.prisma.driveFolder.create({
      data: { userId, parentId, name, kind },
    });
  }

  /**
   * Physical path of a folder mirrors the Drive tree:
   * drive/<user>/avatar and drive/<user>/tour/<date>_<tour name>.
   * Works identically for local, S3 and Supabase (the key is the same).
   */
  private async folderSegments(
    userId: string,
    folder: DriveFolder,
  ): Promise<string[]> {
    const segments: string[] = [];
    const seen = new Set<string>();
    let current: DriveFolder | null = folder;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      segments.unshift(storagePathSegment(current.name));
      if (!current.parentId) break;
      current = await this.prisma.driveFolder.findFirst({
        where: { id: current.parentId, userId },
      });
    }
    return segments;
  }

  private async folderPrefix(
    userId: string,
    folder: DriveFolder,
  ): Promise<string> {
    return `drive/${(await this.folderSegments(userId, folder)).join('/')}`;
  }

  private async storageKeyFor(
    userId: string,
    folder: DriveFolder,
    storedName: string,
  ): Promise<string> {
    return `${await this.folderPrefix(userId, folder)}/${storedName}`;
  }

  /**
   * Creates the root "{slug}_{userId}" plus the "avatar" and "tour" folders
   * if missing (idempotent). Every user has the same shape:
   * `<user>/avatar` and `<user>/tour/<date>_<tour name>`.
   * Called every time a user logs in / registers.
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
      // upgrade: keep the name always matching the {slug}_{uuid} format
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

    const tour = await this.ensureChildFolder(userId, root.id, 'tour', 'tour');

    return { root, avatar, tour };
  }

  async ensureDateFolder(userId: string, parentId?: string, dateKey?: string) {
    let targetParentId = parentId;
    if (!targetParentId) {
      const drive = await this.ensureUserDrive(userId);
      targetParentId = drive.tour.id;
    }
    await this.assertFolderAccess(userId, targetParentId);
    const key = dateKey ?? this.formatDateKey();
    return this.ensureChildFolder(userId, targetParentId, key);
  }

  async getOrCreateTourFolder(
    userId: string,
    tourName: string,
    date?: Date | string,
  ) {
    const drive = await this.ensureUserDrive(userId);
    const name = tourFolderName(tourName || 'tour', date ?? new Date());
    return this.ensureChildFolder(userId, drive.tour.id, name);
  }

  /**
   * Moves pending tour-report evidence into the guide's Drive,
   * under `<user>/tour/{YYYY-MM-DD}_{tour name}`. Runs after Admin/Accounting
   * verifies the report; safe to call more than once.
   */
  async publishTourReportEvidence(assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        guide: { select: { id: true, email: true, name: true } },
        tourReport: true,
      },
    });
    if (!assignment?.guideId || !assignment.tourReport) {
      return { moved: 0 };
    }
    const report = assignment.tourReport;
    if (report.status !== 'VERIFIED') {
      return { moved: 0 };
    }

    const images: ReportEvidenceImage[] = Array.isArray(report.evidenceImages)
      ? (report.evidenceImages as unknown as ReportEvidenceImage[])
      : [];
    const dir = userStorageDir(
      assignment.guideId,
      assignment.guide?.email,
      assignment.guide?.name,
    );
    const prefix = pendingEvidencePrefix(dir, assignment.id);
    const pending = images.filter(
      (img) =>
        typeof img.storageKey === 'string' && img.storageKey.startsWith(prefix),
    );
    if (pending.length === 0) {
      return { moved: 0 };
    }

    const folder = await this.getOrCreateTourFolder(
      assignment.guideId,
      assignment.tourName || assignment.code || 'tour',
      assignment.startDate,
    );

    let moved = 0;
    const updated: ReportEvidenceImage[] = [];
    for (let i = 0; i < images.length; i += 1) {
      const img = images[i];
      const key = typeof img.storageKey === 'string' ? img.storageKey : '';
      if (!key.startsWith(prefix)) {
        updated.push(img);
        continue;
      }
      const safeName = sanitizeFileName(
        img.name || key.split('/').pop() || 'evidence',
      );
      const newKey = await this.storageKeyFor(
        assignment.guideId,
        folder,
        `${Date.now()}-${i}-${safeName}`,
      );
      try {
        await this.storage.rename(key, newKey);
        await this.prisma.driveFile.create({
          data: {
            userId: assignment.guideId,
            folderId: folder.id,
            name: safeName,
            mimeType: img.mimeType ?? null,
            size: Number(img.size) || 0,
            storageKey: newKey,
          },
        });
        moved += 1;
        updated.push({
          ...img,
          storageKey: newKey,
          url: this.storage.url(newKey),
        });
      } catch (error) {
        await this.storage.rename(newKey, key).catch(() => undefined);
        this.logger.warn(
          `Could not publish evidence ${key} for assignment ${assignment.id}: ${(error as Error).message}`,
        );
        updated.push(img);
      }
    }

    if (moved > 0) {
      await this.prisma.tourReport.update({
        where: { id: report.id },
        data: {
          evidenceImages: updated as unknown as Prisma.InputJsonValue,
        },
      });
    }

    const leftovers = await this.storage.list(prefix);
    const stillPending = new Set(
      updated
        .map((img) =>
          typeof img.storageKey === 'string' ? img.storageKey : '',
        )
        .filter((key) => key.startsWith(prefix)),
    );
    for (const entry of leftovers) {
      if (stillPending.has(entry.key)) continue;
      await this.storage.remove(entry.key).catch(() => undefined);
    }

    return { moved };
  }

  async getOrCreateTourGuideDateFolder(userId: string, date?: Date | string) {
    return this.ensureDateFolder(userId, undefined, this.formatDateKey(date));
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
      data: {
        userId,
        parentId: targetId,
        name: dto.name.trim(),
        kind: 'folder',
      },
    });
  }

  async renameFolder(userId: string, id: string, dto: RenameFolderDto) {
    const folder = await this.assertFolderAccess(userId, id);
    if (folder.kind !== 'folder') {
      throw new BadRequestException(
        'Root and avatar folders cannot be renamed',
      );
    }
    const updated = await this.prisma.driveFolder.update({
      where: { id },
      data: { name: dto.name.trim() },
    });

    const ids = await this.collectFolderIds(userId, id);
    const files = await this.prisma.driveFile.findMany({
      where: { userId, folderId: { in: ids } },
      include: { folder: true },
    });
    for (const file of files) {
      const baseName = file.storageKey.split('/').pop() || file.name;
      try {
        const newKey = await this.storageKeyFor(userId, file.folder, baseName);
        if (newKey === file.storageKey) continue;
        await this.storage.rename(file.storageKey, newKey);
        await this.prisma.driveFile.update({
          where: { id: file.id },
          data: { storageKey: newKey },
        });
      } catch (error) {
        this.logger.warn(
          `Could not move file ${file.id} after renaming folder ${id}: ${(error as Error).message}`,
        );
      }
    }
    return updated;
  }

  private async collectFolderIds(
    userId: string,
    rootId: string,
  ): Promise<string[]> {
    const folders = await this.prisma.driveFolder.findMany({
      where: { userId },
      select: { id: true, parentId: true },
    });
    const children = new Map<string, string[]>();
    for (const folder of folders) {
      if (!folder.parentId) continue;
      const list = children.get(folder.parentId) ?? [];
      list.push(folder.id);
      children.set(folder.parentId, list);
    }
    const ids: string[] = [];
    const queue = [rootId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      ids.push(id);
      queue.push(...(children.get(id) ?? []));
    }
    return ids;
  }

  async deleteFolder(userId: string, id: string) {
    const folder = await this.assertFolderAccess(userId, id);
    if (folder.kind !== 'folder') {
      throw new BadRequestException(
        'Root and avatar folders cannot be deleted',
      );
    }
    const keys = await this.collectFileKeys(userId, id);
    for (const key of keys) {
      await this.storage.remove(key);
    }
    await this.prisma.driveFolder.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Shared entry point for avatars: the profile page (self) and the users page
   * (ADMIN replacing another user) both use this endpoint -> same image
   * processing logic, same storage location, same avatarUrl update.
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
    options?: {
      date?: string | Date;
      useDateFolder?: boolean;
      tourName?: string;
    },
  ): Promise<DriveFileView> {
    if (!file?.buffer) {
      throw new BadRequestException('No file uploaded');
    }
    let targetId: string;
    if (folderId) {
      targetId = folderId;
    } else {
      const drive = await this.ensureUserDrive(userId);
      if (options?.tourName) {
        const tourFolder = await this.getOrCreateTourFolder(
          userId,
          options.tourName,
          options.date,
        );
        targetId = tourFolder.id;
      } else if (options?.useDateFolder) {
        const dateFolder = await this.getOrCreateTourGuideDateFolder(
          userId,
          options?.date,
        );
        targetId = dateFolder.id;
      } else {
        targetId = drive.root.id;
      }
    }
    const folder = await this.assertFolderAccess(userId, targetId);

    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    const isAvatar = folder.kind === 'avatar';

    // Avatar: validate using magic bytes before processing
    if (isAvatar) {
      await validateFile(file.buffer, ALLOWED_AVATAR_TYPES, MAX_AVATAR_SIZE);
    }

    // Avatar: automatically resize/crop to the 515x515 standard before saving.
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
    const userDir = userStorageDir(userId, user?.email, user?.name);

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

    const baseName = sanitizeFileName(
      clientName || file.originalname || `file.${ext || 'bin'}`,
    );
    const finalName = isAvatar ? `avatar.${finalExt}` : baseName;
    const storedName = isAvatar ? finalName : `${Date.now()}-${finalName}`;

    const storageKey = await this.storageKeyFor(userId, folder, storedName);

    if (isAvatar) {
      // Delete all old avatar images in the folder before writing the new one:
      // the new image always has the same name avatar.{ext}, so deleting after
      // saving would remove the new file too. Also clean legacy ID-based paths.
      const prefixes = new Set([
        `${await this.folderPrefix(userId, folder)}/`,
        `drive/${userDir}/${targetId}/`,
      ]);
      for (const prefix of prefixes) {
        const oldFiles = await this.storage.list(prefix);
        for (const f of oldFiles) {
          await this.storage.remove(f.key);
        }
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
      // return the url with a version so the browser does not cache the old image
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
   * Automatically normalizes the avatar image to exactly 515x515 (cover-crop,
   * keeps EXIF orientation), accepting images of any size. Only PNG/JPG.
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
      const buffer = await (
        isPng ? pipeline.png({ quality: 95 }) : pipeline.jpeg({ quality: 90 })
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
