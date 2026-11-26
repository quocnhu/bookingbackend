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
        driverProfile: {
            type: import("@prisma/client").$Enums.DriverType;
            id: string;
            rating: number;
            licenseNumber: string;
        } | null;
        guideProfile: {
            type: import("@prisma/client").$Enums.GuideType;
            id: string;
            languages: string[];
            rating: number;
        } | null;
        hotel: {
            name: string;
            id: string;
            email: string | null;
            isActive: boolean;
            contactName: string | null;
            phone: string | null;
            address: string | null;
            commissionPercent: import("@prisma/client/runtime/library").Decimal;
        } | null;
        updatedAt: Date;
        name: string | null;
        id: string;
        createdAt: Date;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        email: string;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        storageQuotaMb: number;
        providerId: string | null;
        hotelId: string | null;
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
        provider: {
            name: string;
            id: string;
            isCompany: boolean;
            assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
        } | null;
    }>;
    create(dto: CreateUserDto): Promise<{
        role: import("@prisma/client").$Enums.RoleType;
        driverProfile: {
            type: import("@prisma/client").$Enums.DriverType;
            id: string;
            rating: number;
            licenseNumber: string;
        } | null;
        guideProfile: {
            type: import("@prisma/client").$Enums.GuideType;
            id: string;
            languages: string[];
            rating: number;
        } | null;
        hotel: {
            name: string;
            id: string;
            email: string | null;
            isActive: boolean;
            contactName: string | null;
            phone: string | null;
            address: string | null;
            commissionPercent: import("@prisma/client/runtime/library").Decimal;
        } | null;
        updatedAt: Date;
        name: string | null;
        id: string;
        createdAt: Date;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        email: string;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        storageQuotaMb: number;
        providerId: string | null;
        hotelId: string | null;
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
        provider: {
            name: string;
            id: string;
            isCompany: boolean;
            assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
        } | null;
    }>;
    update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser): Promise<{
        role: import("@prisma/client").$Enums.RoleType;
        driverProfile: {
            type: import("@prisma/client").$Enums.DriverType;
            id: string;
            rating: number;
            licenseNumber: string;
        } | null;
        guideProfile: {
            type: import("@prisma/client").$Enums.GuideType;
            id: string;
            languages: string[];
            rating: number;
        } | null;
        hotel: {
            name: string;
            id: string;
            email: string | null;
            isActive: boolean;
            contactName: string | null;
            phone: string | null;
            address: string | null;
            commissionPercent: import("@prisma/client/runtime/library").Decimal;
        } | null;
        updatedAt: Date;
        name: string | null;
        id: string;
        createdAt: Date;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        email: string;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        storageQuotaMb: number;
        providerId: string | null;
        hotelId: string | null;
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
        provider: {
            name: string;
            id: string;
            isCompany: boolean;
            assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
        } | null;
    }>;
    updateRoles(id: string, dto: UpdateUserRoleDto, actor: AuthenticatedUser): Promise<{
        role: import("@prisma/client").$Enums.RoleType;
        driverProfile: {
            type: import("@prisma/client").$Enums.DriverType;
            id: string;
            rating: number;
            licenseNumber: string;
        } | null;
        guideProfile: {
            type: import("@prisma/client").$Enums.GuideType;
            id: string;
            languages: string[];
            rating: number;
        } | null;
        hotel: {
            name: string;
            id: string;
            email: string | null;
            isActive: boolean;
            contactName: string | null;
            phone: string | null;
            address: string | null;
            commissionPercent: import("@prisma/client/runtime/library").Decimal;
        } | null;
        updatedAt: Date;
        name: string | null;
        id: string;
        createdAt: Date;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        email: string;
        avatarUrl: string | null;
        isActive: boolean;
        lastLogin: Date | null;
        storageQuotaMb: number;
        providerId: string | null;
        hotelId: string | null;
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
        provider: {
            name: string;
            id: string;
            isCompany: boolean;
            assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
        } | null;
    }>;
    updatePassword(id: string, dto: UpdateUserPasswordDto, actor: AuthenticatedUser): Promise<{
        message: string;
    }>;
    remove(id: string, actor: AuthenticatedUser): Promise<{
        message: string;
    }>;
}
