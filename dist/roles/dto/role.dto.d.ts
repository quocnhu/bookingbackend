import { PaginationDto } from "../../common/dto/pagination.dto";
export declare class CreateRoleDto {
    name: string;
    description?: string;
    permissionIds?: string[];
}
export declare class UpdateRoleDto {
    name?: string;
    description?: string;
    isSystem?: boolean;
    permissionIds?: string[];
}
export declare class QueryRoleDto extends PaginationDto {
}
