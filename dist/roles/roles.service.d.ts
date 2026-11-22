import { PrismaService } from "../prisma/prisma.service";
import { CreateRoleDto, QueryRoleDto, UpdateRoleDto } from './dto/role.dto';
import { PaginatedResult } from "../common/dto/pagination.dto";
export declare class RolesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: QueryRoleDto): Promise<PaginatedResult<any>>;
    findOne(id: string): Promise<{
        permissions: ({
            permission: {
                name: string;
                id: string;
                code: string;
                group: string | null;
            };
        } & {
            roleId: string;
            permissionId: string;
        })[];
        users: ({
            user: {
                role: import("@prisma/client").$Enums.RoleType;
                updatedAt: Date;
                name: string | null;
                id: string;
                createdAt: Date;
                authProvider: import("@prisma/client").$Enums.AuthProvider;
                email: string;
                avatarUrl: string | null;
                passwordHash: string | null;
                isActive: boolean;
                lastLogin: Date | null;
                failedLoginAttempts: number;
                lockoutUntil: Date | null;
                userType: string | null;
                storageQuotaMb: number;
                providerId: string | null;
            };
        } & {
            userId: string;
            roleId: string;
        })[];
    } & {
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        description: string | null;
        isSystem: boolean;
    }>;
    create(dto: CreateRoleDto): Promise<{
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        description: string | null;
        isSystem: boolean;
    }>;
    update(id: string, dto: UpdateRoleDto): Promise<{
        permissions: ({
            permission: {
                name: string;
                id: string;
                code: string;
                group: string | null;
            };
        } & {
            roleId: string;
            permissionId: string;
        })[];
        users: ({
            user: {
                role: import("@prisma/client").$Enums.RoleType;
                updatedAt: Date;
                name: string | null;
                id: string;
                createdAt: Date;
                authProvider: import("@prisma/client").$Enums.AuthProvider;
                email: string;
                avatarUrl: string | null;
                passwordHash: string | null;
                isActive: boolean;
                lastLogin: Date | null;
                failedLoginAttempts: number;
                lockoutUntil: Date | null;
                userType: string | null;
                storageQuotaMb: number;
                providerId: string | null;
            };
        } & {
            userId: string;
            roleId: string;
        })[];
    } & {
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        description: string | null;
        isSystem: boolean;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
