import { PrismaService } from '@/prisma/prisma.service';
import type { FileStorage } from '@/storage';
import { CreateFolderDto, RenameFileDto, RenameFolderDto } from './dto/drive.dto';
export declare const AVATAR_SIZE = 515;
export declare const DEFAULT_QUOTA_MB = 3072;
export declare const MAX_UPLOAD_BYTES: number;
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
export declare class DriveService {
    private readonly prisma;
    private readonly storage;
    constructor(prisma: PrismaService, storage: FileStorage);
    ensureUserDrive(userId: string): Promise<{
        root: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            userId: string | null;
            parentId: string | null;
            kind: string;
        };
        avatar: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            userId: string | null;
            parentId: string | null;
            kind: string;
        };
    }>;
    listContents(userId: string, folderId?: string): Promise<{
        current: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            userId: string | null;
            parentId: string | null;
            kind: string;
        } | null;
        breadcrumb: {
            id: string | null;
            name: string;
        }[];
        folders: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            userId: string | null;
            parentId: string | null;
            kind: string;
        }[];
        files: {
            url: string;
            id: string;
            createdAt: Date;
            name: string;
            userId: string | null;
            folderId: string;
            mimeType: string | null;
            size: number;
            storageKey: string;
        }[];
        quota: {
            unlimited: boolean;
            quotaBytes: null;
            usedBytes: number;
            freeBytes: null;
            usedPercent: number;
            maxUploadBytes: null;
        } | {
            unlimited: boolean;
            quotaBytes: number;
            usedBytes: number;
            freeBytes: number;
            usedPercent: number;
            maxUploadBytes: number;
        };
    }>;
    createFolder(userId: string, dto: CreateFolderDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string | null;
        parentId: string | null;
        kind: string;
    }>;
    renameFolder(userId: string, id: string, dto: RenameFolderDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string | null;
        parentId: string | null;
        kind: string;
    }>;
    deleteFolder(userId: string, id: string): Promise<{
        success: boolean;
    }>;
    uploadAvatar(actor: {
        id: string;
        role: string;
    }, file: Express.Multer.File, targetUserId?: string): Promise<DriveFileView>;
    uploadFile(userId: string, file: Express.Multer.File, folderId?: string, clientName?: string): Promise<DriveFileView>;
    renameFile(userId: string, id: string, dto: RenameFileDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        userId: string | null;
        folderId: string;
        mimeType: string | null;
        size: number;
        storageKey: string;
    }>;
    deleteFile(userId: string, id: string): Promise<{
        success: boolean;
    }>;
    private assertFolderAccess;
    private buildBreadcrumb;
    private collectFileKeys;
    private processAvatar;
    private userSlug;
    private usedBytes;
    private quotaInfo;
    private formatBytes;
}
