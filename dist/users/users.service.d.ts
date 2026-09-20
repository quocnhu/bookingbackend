import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto, QueryUserDto, UpdateUserDto, UpdateUserRoleDto } from './dto/user.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { RoleType } from '@prisma/client';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { UpdateUserPasswordDto } from './dto/user-password.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private userSelect;
    findAll(query: QueryUserDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        email: string;
        role: import("@prisma/client").$Enums.RoleType;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        userType: string | null;
        storageQuotaMb: number;
        roles: ({
            role: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                isSystem: boolean;
            };
        } & {
            userId: string;
            roleId: string;
        })[];
        permissions: ({
            permission: {
                id: string;
                name: string;
                code: string;
                group: string | null;
            };
        } & {
            userId: string;
            permissionId: string;
        })[];
    }>;
    create(dto: CreateUserDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        email: string;
        role: import("@prisma/client").$Enums.RoleType;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        userType: string | null;
        storageQuotaMb: number;
        roles: ({
            role: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                isSystem: boolean;
            };
        } & {
            userId: string;
            roleId: string;
        })[];
        permissions: ({
            permission: {
                id: string;
                name: string;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        email: string;
        role: import("@prisma/client").$Enums.RoleType;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        userType: string | null;
        storageQuotaMb: number;
        roles: ({
            role: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                isSystem: boolean;
            };
        } & {
            userId: string;
            roleId: string;
        })[];
        permissions: ({
            permission: {
                id: string;
                name: string;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        email: string;
        role: import("@prisma/client").$Enums.RoleType;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        userType: string | null;
        storageQuotaMb: number;
        roles: ({
            role: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                isSystem: boolean;
            };
        } & {
            userId: string;
            roleId: string;
        })[];
        permissions: ({
            permission: {
                id: string;
                name: string;
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
