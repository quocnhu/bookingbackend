import { UsersService } from './users.service';
import { CreateUserDto, QueryUserDto, UpdateUserDto, UpdateUserRoleDto } from './dto/user.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { UpdateUserPasswordDto } from './dto/user-password.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(query: QueryUserDto, actor: AuthenticatedUser): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findOne(id: string): Promise<{
        role: import("@prisma/client").$Enums.RoleType;
        id: string;
        createdAt: Date;
        name: string | null;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        email: string;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        userType: string | null;
        storageQuotaMb: number;
        updatedAt: Date;
        roles: ({
            role: {
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
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
        role: import("@prisma/client").$Enums.RoleType;
        id: string;
        createdAt: Date;
        name: string | null;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        email: string;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        userType: string | null;
        storageQuotaMb: number;
        updatedAt: Date;
        roles: ({
            role: {
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
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
    update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser): Promise<{
        role: import("@prisma/client").$Enums.RoleType;
        id: string;
        createdAt: Date;
        name: string | null;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        email: string;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        userType: string | null;
        storageQuotaMb: number;
        updatedAt: Date;
        roles: ({
            role: {
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
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
    updateRoles(id: string, dto: UpdateUserRoleDto, actor: AuthenticatedUser): Promise<{
        role: import("@prisma/client").$Enums.RoleType;
        id: string;
        createdAt: Date;
        name: string | null;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        email: string;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        userType: string | null;
        storageQuotaMb: number;
        updatedAt: Date;
        roles: ({
            role: {
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
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
    updatePassword(id: string, dto: UpdateUserPasswordDto, actor: AuthenticatedUser): Promise<{
        message: string;
    }>;
    remove(id: string, actor: AuthenticatedUser): Promise<{
        message: string;
    }>;
}
