import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto, QueryUserDto, UpdateUserDto, UpdateUserRoleDto } from './dto/user.dto';
import { PaginatedResult } from "../common/dto/pagination.dto";
import { RoleType } from '@prisma/client';
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { UpdateUserPasswordDto } from './dto/user-password.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private userSelect;
    findAll(query: QueryUserDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>>;
    findOne(id: string): Promise<{
        role: import("@prisma/client").$Enums.RoleType;
        updatedAt: Date;
        name: string | null;
        id: string;
        createdAt: Date;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        email: string;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        userType: string | null;
        storageQuotaMb: number;
        roles: ({
            role: {
                updatedAt: Date;
                name: string;
                id: string;
                createdAt: Date;
                description: string | null;
                isSystem: boolean;
            };
        } & {
            userId: string;
            roleId: string;
        })[];
        permissions: ({
            permission: {
                name: string;
                id: string;
                code: string;
                group: string | null;
            };
        } & {
            userId: string;
            permissionId: string;
        })[];
    }>;
    create(dto: CreateUserDto): Promise<{
        role: import("@prisma/client").$Enums.RoleType;
        updatedAt: Date;
        name: string | null;
        id: string;
        createdAt: Date;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        email: string;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        userType: string | null;
        storageQuotaMb: number;
        roles: ({
            role: {
                updatedAt: Date;
                name: string;
                id: string;
                createdAt: Date;
                description: string | null;
                isSystem: boolean;
            };
        } & {
            userId: string;
            roleId: string;
        })[];
        permissions: ({
            permission: {
                name: string;
                id: string;
                code: string;
                group: string | null;
            };
        } & {
            userId: string;
            permissionId: string;
        })[];
    }>;
    update(id: string, dto: UpdateUserDto, actor: {
        id: string;
        role: RoleType;
    }): Promise<{
        role: import("@prisma/client").$Enums.RoleType;
        updatedAt: Date;
        name: string | null;
        id: string;
        createdAt: Date;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        email: string;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        userType: string | null;
        storageQuotaMb: number;
        roles: ({
            role: {
                updatedAt: Date;
                name: string;
                id: string;
                createdAt: Date;
                description: string | null;
                isSystem: boolean;
            };
        } & {
            userId: string;
            roleId: string;
        })[];
        permissions: ({
            permission: {
                name: string;
                id: string;
                code: string;
                group: string | null;
            };
        } & {
            userId: string;
            permissionId: string;
        })[];
    }>;
    updateRoles(id: string, dto: UpdateUserRoleDto, actor: {
        id: string;
        role: RoleType;
    }): Promise<{
        role: import("@prisma/client").$Enums.RoleType;
        updatedAt: Date;
        name: string | null;
        id: string;
        createdAt: Date;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        email: string;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        userType: string | null;
        storageQuotaMb: number;
        roles: ({
            role: {
                updatedAt: Date;
                name: string;
                id: string;
                createdAt: Date;
                description: string | null;
                isSystem: boolean;
            };
        } & {
            userId: string;
            roleId: string;
        })[];
        permissions: ({
            permission: {
                name: string;
                id: string;
                code: string;
                group: string | null;
            };
        } & {
            userId: string;
            permissionId: string;
        })[];
    }>;
    private getAdminRoleId;
    updatePassword(id: string, dto: UpdateUserPasswordDto, actor: {
        id: string;
        role: RoleType;
    }): Promise<{
        message: string;
    }>;
    remove(id: string, actor: {
        id: string;
        role: RoleType;
    }): Promise<{
        message: string;
    }>;
}
