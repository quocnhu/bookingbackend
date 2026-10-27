import { PrismaService } from "../prisma/prisma.service";
import type { FileStorage } from "../storage";
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
    private readonly logger;
    constructor(prisma: PrismaService, storage: FileStorage);
    private formatDateKey;
    private ensureChildFolder;
    private folderSegments;
    private folderPrefix;
    private storageKeyFor;
    ensureUserDrive(userId: string): Promise<{
        root: {
            id: string;
            createdAt: Date;
            name: string;
            userId: string | null;
            updatedAt: Date;
            parentId: string | null;
            kind: string;
        };
        avatar: {
            id: string;
            createdAt: Date;
            name: string;
            userId: string | null;
            updatedAt: Date;
            parentId: string | null;
            kind: string;
        };
        tour: {
            id: string;
            createdAt: Date;
            name: string;
            userId: string | null;
            updatedAt: Date;
            parentId: string | null;
            kind: string;
        };
    }>;
    ensureDateFolder(userId: string, parentId?: string, dateKey?: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        userId: string | null;
        updatedAt: Date;
        parentId: string | null;
        kind: string;
    }>;
    getOrCreateTourFolder(userId: string, tourName: string, date?: Date | string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        userId: string | null;
        updatedAt: Date;
        parentId: string | null;
        kind: string;
    }>;
    publishTourReportEvidence(assignmentId: string): Promise<{
        moved: number;
    }>;
    getOrCreateTourGuideDateFolder(userId: string, date?: Date | string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        userId: string | null;
        updatedAt: Date;
        parentId: string | null;
        kind: string;
    }>;
    listContents(userId: string, folderId?: string): Promise<{
        current: {
            id: string;
            createdAt: Date;
            name: string;
            userId: string | null;
            updatedAt: Date;
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
            name: string;
            userId: string | null;
            updatedAt: Date;
            parentId: string | null;
            kind: string;
        }[];
        files: {
            url: string;
            id: string;
            createdAt: Date;
            name: string;
            userId: string | null;
            storageKey: string;
            size: number;
            mimeType: string | null;
            folderId: string;
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
        name: string;
        userId: string | null;
        updatedAt: Date;
        parentId: string | null;
        kind: string;
    }>;
    renameFolder(userId: string, id: string, dto: RenameFolderDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        userId: string | null;
        updatedAt: Date;
        parentId: string | null;
        kind: string;
    }>;
    private collectFolderIds;
    deleteFolder(userId: string, id: string): Promise<{
        success: boolean;
    }>;
    uploadAvatar(actor: {
        id: string;
        role: string;
    }, file: Express.Multer.File, targetUserId?: string): Promise<DriveFileView>;
    uploadFile(userId: string, file: Express.Multer.File, folderId?: string, clientName?: string, options?: {
        date?: string | Date;
        useDateFolder?: boolean;
        tourName?: string;
    }): Promise<DriveFileView>;
    renameFile(userId: string, id: string, dto: RenameFileDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        userId: string | null;
        storageKey: string;
        size: number;
        mimeType: string | null;
        folderId: string;
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
