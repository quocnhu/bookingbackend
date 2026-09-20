import { RolesService } from './roles.service';
import { CreateRoleDto, QueryRoleDto, UpdateRoleDto } from './dto/role.dto';
export declare class RolesController {
    private readonly rolesService;
    constructor(rolesService: RolesService);
    findAll(query: QueryRoleDto): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findAllForSelect(): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findOne(id: string): Promise<{
        permissions: ({
            permission: {
                id: string;
                name: string;
                code: string;
                group: string | null;
            };
        } & {
            roleId: string;
            permissionId: string;
        })[];
        users: ({
            user: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string | null;
                providerId: string | null;
                email: string;
                role: import("@prisma/client").$Enums.RoleType;
                authProvider: import("@prisma/client").$Enums.AuthProvider;
                avatarUrl: string | null;
                passwordHash: string | null;
                isActive: boolean;
                lastLogin: Date | null;
                failedLoginAttempts: number;
                lockoutUntil: Date | null;
                userType: string | null;
                storageQuotaMb: number;
            };
        } & {
            userId: string;
            roleId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isSystem: boolean;
    }>;
    create(dto: CreateRoleDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isSystem: boolean;
    }>;
    update(id: string, dto: UpdateRoleDto): Promise<{
        permissions: ({
            permission: {
                id: string;
                name: string;
                code: string;
                group: string | null;
            };
        } & {
            roleId: string;
            permissionId: string;
        })[];
        users: ({
            user: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string | null;
                providerId: string | null;
                email: string;
                role: import("@prisma/client").$Enums.RoleType;
                authProvider: import("@prisma/client").$Enums.AuthProvider;
                avatarUrl: string | null;
                passwordHash: string | null;
                isActive: boolean;
                lastLogin: Date | null;
                failedLoginAttempts: number;
                lockoutUntil: Date | null;
                userType: string | null;
                storageQuotaMb: number;
            };
        } & {
            userId: string;
            roleId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isSystem: boolean;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
