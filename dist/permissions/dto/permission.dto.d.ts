import { PaginationDto } from "../../common/dto/pagination.dto";
export declare class CreatePermissionDto {
    code: string;
    name: string;
    group?: string;
}
export declare class UpdatePermissionDto {
    name?: string;
    group?: string;
}
export declare class QueryPermissionDto extends PaginationDto {
}
