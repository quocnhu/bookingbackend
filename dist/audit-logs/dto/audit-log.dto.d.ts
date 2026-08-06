import { PaginationDto } from "../../common/dto/pagination.dto";
export declare class QueryAuditDto extends PaginationDto {
    q?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    changedBy?: string;
    from?: string;
    to?: string;
}
