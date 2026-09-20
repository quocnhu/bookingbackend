import { PaginationDto } from '@/common/dto/pagination.dto';
export declare class QueryAuthActivityDto extends PaginationDto {
    eventType?: string;
    userId?: string;
    from?: string;
    to?: string;
}
