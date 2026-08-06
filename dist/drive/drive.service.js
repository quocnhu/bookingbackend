"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriveService = exports.MAX_UPLOAD_BYTES = exports.DEFAULT_QUOTA_MB = exports.AVATAR_SIZE = void 0;
const common_1 = require("@nestjs/common");
const sharp_1 = __importDefault(require("sharp"));
const prisma_service_1 = require("../prisma/prisma.service");
const storage_1 = require("../storage");
exports.AVATAR_SIZE = 515;
exports.DEFAULT_QUOTA_MB = 3072;
exports.MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const MB = 1024 * 1024;
let DriveService = class DriveService {
    prisma;
    storage;
    constructor(prisma, storage) {
        this.prisma = prisma;
        this.storage = storage;
    }
    async ensureUserDrive(userId) {
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
        }
        else if (root.name !== rootName) {
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
    async listContents(userId, folderId) {
        let current = null;
        let parentId = null;
        if (folderId) {
            current = await this.prisma.driveFolder.findFirst({
                where: { id: folderId, userId },
            });
            if (!current) {
                throw new common_1.NotFoundException('Folder not found');
            }
            parentId = current.id;
        }
        else {
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
    async createFolder(userId, dto) {
        const targetId = dto.parentId ?? (await this.ensureUserDrive(userId)).root.id;
        await this.assertFolderAccess(userId, targetId);
        return this.prisma.driveFolder.create({
            data: { userId, parentId: targetId, name: dto.name.trim(), kind: 'folder' },
        });
    }
    async renameFolder(userId, id, dto) {
        const folder = await this.assertFolderAccess(userId, id);
        if (folder.kind !== 'folder') {
            throw new common_1.BadRequestException('Root and avatar folders cannot be renamed');
        }
        return this.prisma.driveFolder.update({
            where: { id },
            data: { name: dto.name.trim() },
        });
    }
    async deleteFolder(userId, id) {
        const folder = await this.assertFolderAccess(userId, id);
        if (folder.kind !== 'folder') {
            throw new common_1.BadRequestException('Root and avatar folders cannot be deleted');
        }
        const keys = await this.collectFileKeys(userId, id);
        for (const key of keys) {
            await this.storage.remove(key);
        }
        await this.prisma.driveFolder.delete({ where: { id } });
        return { success: true };
    }
    async uploadAvatar(actor, file, targetUserId) {
        let uid = actor.id;
        if (targetUserId && targetUserId !== actor.id) {
            if (actor.role !== 'ADMIN') {
                throw new common_1.BadRequestException('You can only update your own avatar');
            }
            uid = targetUserId;
        }
        const { avatar } = await this.ensureUserDrive(uid);
        return this.uploadFile(uid, file, avatar.id);
    }
    async uploadFile(userId, file, folderId, clientName) {
        if (!file?.buffer) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        const targetId = folderId ?? (await this.ensureUserDrive(userId)).root.id;
        const folder = await this.assertFolderAccess(userId, targetId);
        const ext = (file.originalname.split('.').pop() || '').toLowerCase();
        const isAvatar = folder.kind === 'avatar';
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
            if (buffer.length > exports.MAX_UPLOAD_BYTES) {
                throw new common_1.BadRequestException(`Max upload size is ${this.formatBytes(exports.MAX_UPLOAD_BYTES)} per file`);
            }
            const quotaBytes = (user?.storageQuotaMb ?? exports.DEFAULT_QUOTA_MB) * MB;
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
                throw new common_1.BadRequestException(`Storage quota exceeded (limit ${this.formatBytes(quotaBytes)})`);
            }
        }
        const baseName = (clientName || file.originalname || `file.${ext || 'bin'}`)
            .split('/')
            .pop()
            .replace(/[^\w.\- ]/g, '_');
        const finalName = isAvatar ? `avatar.${finalExt}` : baseName;
        const storedName = isAvatar
            ? finalName
            : `${Date.now()}-${finalName}`;
        const storageKey = `drive/${userDir}/${targetId}/${storedName}`;
        await this.storage.save(storageKey, buffer, {
            contentType: mime || undefined,
        });
        if (isAvatar) {
            const old = await this.prisma.driveFile.findMany({
                where: { userId, folderId: targetId },
            });
            for (const o of old) {
                await this.storage.remove(o.storageKey);
            }
            await this.prisma.driveFile.deleteMany({
                where: { userId, folderId: targetId },
            });
        }
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
            return { ...saved, url: avatarUrl };
        }
        return { ...saved, url: this.storage.url(storageKey) };
    }
    async renameFile(userId, id, dto) {
        const file = await this.prisma.driveFile.findFirst({
            where: { id, userId },
        });
        if (!file) {
            throw new common_1.NotFoundException('File not found');
        }
        const folder = await this.prisma.driveFolder.findUnique({
            where: { id: file.folderId },
        });
        if (folder?.kind === 'avatar') {
            throw new common_1.BadRequestException('Avatar files cannot be renamed');
        }
        const name = dto.name.replace(/[^\w.\- ]/g, '_');
        return this.prisma.driveFile.update({ where: { id }, data: { name } });
    }
    async deleteFile(userId, id) {
        const file = await this.prisma.driveFile.findFirst({
            where: { id, userId },
        });
        if (!file) {
            throw new common_1.NotFoundException('File not found');
        }
        await this.storage.remove(file.storageKey);
        await this.prisma.driveFile.delete({ where: { id } });
        return { success: true };
    }
    async assertFolderAccess(userId, folderId) {
        const folder = await this.prisma.driveFolder.findFirst({
            where: { id: folderId, userId },
        });
        if (!folder) {
            throw new common_1.NotFoundException('Folder not found');
        }
        return folder;
    }
    async buildBreadcrumb(userId, folderId) {
        const root = await this.prisma.driveFolder.findFirst({
            where: { userId, parentId: null, kind: 'root' },
        });
        const items = [];
        if (root)
            items.push({ id: null, name: root.name });
        if (!folderId)
            return items;
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
    async collectFileKeys(userId, folderId) {
        const keys = [];
        const walk = async (fid) => {
            const files = await this.prisma.driveFile.findMany({
                where: { userId, folderId: fid },
                select: { storageKey: true },
            });
            keys.push(...files.map((f) => f.storageKey));
            const subs = await this.prisma.driveFolder.findMany({
                where: { userId, parentId: fid },
            });
            for (const s of subs)
                await walk(s.id);
        };
        await walk(folderId);
        return keys;
    }
    async processAvatar(file) {
        const ext = (file.originalname.split('.').pop() || '').toLowerCase();
        const mime = (file.mimetype || '').toLowerCase();
        const allowed = ['png', 'jpg', 'jpeg'];
        if (!allowed.includes(ext) || !['image/png', 'image/jpeg'].includes(mime)) {
            throw new common_1.BadRequestException(`Avatar only allows PNG or JPG files (got .${ext || 'unknown'})`);
        }
        const isPng = ext === 'png';
        try {
            const pipeline = (0, sharp_1.default)(file.buffer, { failOn: 'none' })
                .rotate()
                .resize(exports.AVATAR_SIZE, exports.AVATAR_SIZE, { fit: 'cover', position: 'centre' });
            const buffer = await (isPng
                ? pipeline.png({ quality: 95 })
                : pipeline.jpeg({ quality: 90 })).toBuffer();
            return {
                buffer,
                mimeType: isPng ? 'image/png' : 'image/jpeg',
                ext: isPng ? 'png' : 'jpg',
            };
        }
        catch {
            throw new common_1.BadRequestException('Could not process the image. Please upload a valid PNG or JPG picture.');
        }
    }
    userSlug(email, name, fallback) {
        const raw = email?.split('@')[0] || name || fallback || 'user';
        const slug = raw
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        return slug || fallback || 'user';
    }
    async usedBytes(userId) {
        const agg = await this.prisma.driveFile.aggregate({
            where: { userId },
            _sum: { size: true },
        });
        return agg._sum.size ?? 0;
    }
    async quotaInfo(userId) {
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
        const quotaBytes = (user?.storageQuotaMb ?? exports.DEFAULT_QUOTA_MB) * MB;
        return {
            unlimited: false,
            quotaBytes,
            usedBytes,
            freeBytes: Math.max(0, quotaBytes - usedBytes),
            usedPercent: Math.min(100, Math.round((usedBytes / quotaBytes) * 100)),
            maxUploadBytes: exports.MAX_UPLOAD_BYTES,
        };
    }
    formatBytes(bytes) {
        if (bytes >= 1024 * MB)
            return `${(bytes / (1024 * MB)).toFixed(1)} GB`;
        if (bytes >= MB)
            return `${(bytes / MB).toFixed(1)} MB`;
        if (bytes >= 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${bytes} B`;
    }
};
exports.DriveService = DriveService;
exports.DriveService = DriveService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(storage_1.STORAGE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], DriveService);
//# sourceMappingURL=drive.service.js.map