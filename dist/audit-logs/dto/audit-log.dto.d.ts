import { PaginationDto } from "../../common/dto/pagination.dto";
export declare class QueryAuditDto extends PaginationDto {
    entityType?: string;
    entityId?: string;
    action?: string;
    changedBy?: string;
    from?: string;
    to?: string;
}
