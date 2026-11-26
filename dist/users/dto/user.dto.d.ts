import { PaginationDto } from "../../common/dto/pagination.dto";
import { DriverType, GuideType, RoleType } from '@prisma/client';
export declare class CreateUserDto {
    email: string;
    name?: string;
    avatarUrl?: string;
    password?: string;
    role?: RoleType;
    roleIds?: string[];
    permissionIds?: string[];
    hotelId?: string | null;
    hotelCommissionPercent?: number;
    providerId?: string | null;
    guideProfile?: UpdateGuideProfileDto | null;
    driverProfile?: UpdateDriverProfileDto | null;
}
export declare class UpdateGuideProfileDto {
    type?: GuideType;
    languages?: string[];
    rating?: number;
}
export declare class UpdateDriverProfileDto {
    licenseNumber?: string;
    type?: DriverType;
    rating?: number;
}
export declare class UpdateUserDto {
    name?: string;
    avatarUrl?: string;
    role?: RoleType;
    isActive?: boolean;
    storageQuotaMb?: number;
    hotelId?: string | null;
    hotelCommissionPercent?: number;
    providerId?: string | null;
    guideProfile?: UpdateGuideProfileDto | null;
    driverProfile?: UpdateDriverProfileDto | null;
    roleIds?: string[];
    permissionIds?: string[];
}
export declare class UpdateUserRoleDto {
    roleIds: string[];
    permissionIds: string[];
}
export declare class QueryUserDto extends PaginationDto {
    role?: RoleType;
    isActive?: boolean;
}
