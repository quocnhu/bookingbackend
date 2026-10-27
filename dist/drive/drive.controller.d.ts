import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { DriveService } from './drive.service';
import { CreateFolderDto, RenameFileDto, RenameFolderDto } from './dto/drive.dto';
export declare class DriveController {
    private readonly driveService;
    constructor(driveService: DriveService);
    root(user: AuthenticatedUser): Promise<{
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
    ensureDate(user: AuthenticatedUser, date?: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        userId: string | null;
        updatedAt: Date;
        parentId: string | null;
        kind: string;
    }>;
    ensureDatePost(user: AuthenticatedUser, date?: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        userId: string | null;
        updatedAt: Date;
        parentId: string | null;
        kind: string;
    }>;
    folder(id: string, user: AuthenticatedUser): Promise<{
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
    createFolder(dto: CreateFolderDto, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        userId: string | null;
        updatedAt: Date;
        parentId: string | null;
        kind: string;
    }>;
    renameFolder(id: string, dto: RenameFolderDto, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        userId: string | null;
        updatedAt: Date;
        parentId: string | null;
        kind: string;
    }>;
    deleteFolder(id: string, user: AuthenticatedUser): Promise<{
        success: boolean;
    }>;
    uploadAvatar(file: Express.Multer.File, targetUserId: string | undefined, user: AuthenticatedUser): Promise<import("./drive.service").DriveFileView>;
    upload(file: Express.Multer.File, folderId: string, name: string, date: string, useDateFolder: string, tourName: string, user: AuthenticatedUser): Promise<import("./drive.service").DriveFileView>;
    renameFile(id: string, dto: RenameFileDto, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        userId: string | null;
        storageKey: string;
        size: number;
        mimeType: string | null;
        folderId: string;
    }>;
    deleteFile(id: string, user: AuthenticatedUser): Promise<{
        success: boolean;
    }>;
}
