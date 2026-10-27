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
var DriveService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriveService = exports.MAX_UPLOAD_BYTES = exports.DEFAULT_QUOTA_MB = exports.AVATAR_SIZE = void 0;
const common_1 = require("@nestjs/common");
const sharp_1 = __importDefault(require("sharp"));
const prisma_service_1 = require("../prisma/prisma.service");
const storage_1 = require("../storage");
const file_validation_util_1 = require("../common/utils/file-validation.util");
const storage_key_util_1 = require("../common/utils/storage-key.util");
exports.AVATAR_SIZE = 515;
exports.DEFAULT_QUOTA_MB = 3072;
exports.MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const MB = 1024 * 1024;
let DriveService = DriveService_1 = class DriveService {
    prisma;
    storage;
    logger = new common_1.Logger(DriveService_1.name);
    constructor(prisma, storage) {
        this.prisma = prisma;
        this.storage = storage;
    }
    formatDateKey(date = new Date()) {
        return (0, storage_key_util_1.formatDateKey)(date);
    }
    async ensureChildFolder(userId, parentId, name, kind = 'folder') {
        const existing = await this.prisma.driveFolder.findFirst({
            where: { userId, parentId, name },
        });
        if (existing)
            return existing;
        return this.prisma.driveFolder.create({
            data: { userId, parentId, name, kind },
        });
    }
    async folderSegments(userId, folder) {
        const segments = [];
        const seen = new Set();
        let current = folder;
        while (current && !seen.has(current.id)) {
            seen.add(current.id);
            segments.unshift((0, storage_key_util_1.storagePathSegment)(current.name));
            if (!current.parentId)
                break;
            current = await this.prisma.driveFolder.findFirst({
                where: { id: current.parentId, userId },
            });
        }
        return segments;
    }
    async folderPrefix(userId, folder) {
        return `drive/${(await this.folderSegments(userId, folder)).join('/')}`;
    }
    async storageKeyFor(userId, folder, storedName) {
        return `${await this.folderPrefix(userId, folder)}/${storedName}`;
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
        const tour = await this.ensureChildFolder(userId, root.id, 'tour', 'tour');
        return { root, avatar, tour };
    }
    async ensureDateFolder(userId, parentId, dateKey) {
        let targetParentId = parentId;
        if (!targetParentId) {
            const drive = await this.ensureUserDrive(userId);
            targetParentId = drive.tour.id;
        }
        await this.assertFolderAccess(userId, targetParentId);
        const key = dateKey ?? this.formatDateKey();
        return this.ensureChildFolder(userId, targetParentId, key);
    }
    async getOrCreateTourFolder(userId, tourName, date) {
        const drive = await this.ensureUserDrive(userId);
        const name = (0, storage_key_util_1.tourFolderName)(tourName || 'tour', date ?? new Date());
        return this.ensureChildFolder(userId, drive.tour.id, name);
    }
    async publishTourReportEvidence(assignmentId) {
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
        const images = Array.isArray(report.evidenceImages)
            ? report.evidenceImages
            : [];
        const dir = (0, storage_key_util_1.userStorageDir)(assignment.guideId, assignment.guide?.email, assignment.guide?.name);
        const prefix = (0, storage_key_util_1.pendingEvidencePrefix)(dir, assignment.id);
        const pending = images.filter((img) => typeof img.storageKey === 'string' && img.storageKey.startsWith(prefix));
        if (pending.length === 0) {
            return { moved: 0 };
        }
        const folder = await this.getOrCreateTourFolder(assignment.guideId, assignment.tourName || assignment.code || 'tour', assignment.startDate);
        let moved = 0;
        const updated = [];
        for (let i = 0; i < images.length; i += 1) {
            const img = images[i];
            const key = typeof img.storageKey === 'string' ? img.storageKey : '';
            if (!key.startsWith(prefix)) {
                updated.push(img);
                continue;
            }
            const safeName = (0, file_validation_util_1.sanitizeFileName)(img.name || key.split('/').pop() || 'evidence');
            const newKey = await this.storageKeyFor(assignment.guideId, folder, `${Date.now()}-${i}-${safeName}`);
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
            }
            catch (error) {
                await this.storage.rename(newKey, key).catch(() => undefined);
                this.logger.warn(`Could not publish evidence ${key} for assignment ${assignment.id}: ${error.message}`);
                updated.push(img);
            }
        }
        if (moved > 0) {
            await this.prisma.tourReport.update({
                where: { id: report.id },
                data: {
                    evidenceImages: updated,
                },
            });
        }
        const leftovers = await this.storage.list(prefix);
        const stillPending = new Set(updated
            .map((img) => typeof img.storageKey === 'string' ? img.storageKey : '')
            .filter((key) => key.startsWith(prefix)));
        for (const entry of leftovers) {
            if (stillPending.has(entry.key))
                continue;
            await this.storage.remove(entry.key).catch(() => undefined);
        }
        return { moved };
    }
    async getOrCreateTourGuideDateFolder(userId, date) {
        return this.ensureDateFolder(userId, undefined, this.formatDateKey(date));
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
            data: {
                userId,
                parentId: targetId,
                name: dto.name.trim(),
                kind: 'folder',
            },
        });
    }
    async renameFolder(userId, id, dto) {
        const folder = await this.assertFolderAccess(userId, id);
        if (folder.kind !== 'folder') {
            throw new common_1.BadRequestException('Root and avatar folders cannot be renamed');
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
                if (newKey === file.storageKey)
                    continue;
                await this.storage.rename(file.storageKey, newKey);
                await this.prisma.driveFile.update({
                    where: { id: file.id },
                    data: { storageKey: newKey },
                });
            }
            catch (error) {
                this.logger.warn(`Could not move file ${file.id} after renaming folder ${id}: ${error.message}`);
            }
        }
        return updated;
    }
    async collectFolderIds(userId, rootId) {
        const folders = await this.prisma.driveFolder.findMany({
            where: { userId },
            select: { id: true, parentId: true },
        });
        const children = new Map();
        for (const folder of folders) {
            if (!folder.parentId)
                continue;
            const list = children.get(folder.parentId) ?? [];
            list.push(folder.id);
            children.set(folder.parentId, list);
        }
        const ids = [];
        const queue = [rootId];
        while (queue.length > 0) {
            const id = queue.shift();
            ids.push(id);
            queue.push(...(children.get(id) ?? []));
        }
        return ids;
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
    async uploadFile(userId, file, folderId, clientName, options) {
        if (!file?.buffer) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        let targetId;
        if (folderId) {
            targetId = folderId;
        }
        else {
            const drive = await this.ensureUserDrive(userId);
            if (options?.tourName) {
                const tourFolder = await this.getOrCreateTourFolder(userId, options.tourName, options.date);
                targetId = tourFolder.id;
            }
            else if (options?.useDateFolder) {
                const dateFolder = await this.getOrCreateTourGuideDateFolder(userId, options?.date);
                targetId = dateFolder.id;
            }
            else {
                targetId = drive.root.id;
            }
        }
        const folder = await this.assertFolderAccess(userId, targetId);
        const ext = (file.originalname.split('.').pop() || '').toLowerCase();
        const isAvatar = folder.kind === 'avatar';
        if (isAvatar) {
            await (0, file_validation_util_1.validateFile)(file.buffer, file_validation_util_1.ALLOWED_AVATAR_TYPES, file_validation_util_1.MAX_AVATAR_SIZE);
        }
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
        const userDir = (0, storage_key_util_1.userStorageDir)(userId, user?.email, user?.name);
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
        const baseName = (0, file_validation_util_1.sanitizeFileName)(clientName || file.originalname || `file.${ext || 'bin'}`);
        const finalName = isAvatar ? `avatar.${finalExt}` : baseName;
        const storedName = isAvatar ? finalName : `${Date.now()}-${finalName}`;
        const storageKey = await this.storageKeyFor(userId, folder, storedName);
        if (isAvatar) {
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
            const buffer = await (isPng ? pipeline.png({ quality: 95 }) : pipeline.jpeg({ quality: 90 })).toBuffer();
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
exports.DriveService = DriveService = DriveService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(storage_1.STORAGE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], DriveService);
//# sourceMappingURL=drive.service.js.map