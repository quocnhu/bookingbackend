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
                role: import("@prisma/client").$Enums.RoleType;
                id: string;
                createdAt: Date;
                name: string | null;
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
                updatedAt: Date;
            };
        } & {
            userId: string;
            roleId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        isSystem: boolean;
    }>;
    create(dto: CreateRoleDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
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
                role: import("@prisma/client").$Enums.RoleType;
                id: string;
                createdAt: Date;
                name: string | null;
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
                updatedAt: Date;
            };
        } & {
            userId: string;
            roleId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        isSystem: boolean;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
