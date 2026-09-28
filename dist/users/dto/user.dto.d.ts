import { PaginationDto } from "../../common/dto/pagination.dto";
import { RoleType } from '@prisma/client';
export declare class CreateUserDto {
    email: string;
    name?: string;
    avatarUrl?: string;
    password?: string;
    role?: RoleType;
    userType?: string;
    roleIds?: string[];
    permissionIds?: string[];
}
export declare class UpdateUserDto {
    name?: string;
    avatarUrl?: string;
    role?: RoleType;
    userType?: string;
    isActive?: boolean;
    storageQuotaMb?: number;
    roleIds?: string[];
    permissionIds?: string[];
}
export declare class UpdateUserRoleDto {
    roleIds: string[];
    permissionIds: string[];
}
export declare class QueryUserDto extends PaginationDto {
    role?: RoleType;
    userType?: string;
    isActive?: boolean;
}
