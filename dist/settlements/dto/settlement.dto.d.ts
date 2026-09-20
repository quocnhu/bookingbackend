import { PaginationDto } from '@/common/dto/pagination.dto';
import { FeeFlowType } from '@prisma/client';
export declare class CreateSettlementDto {
    amount: number;
    note?: string;
    imageUrl?: string;
    categoryId?: string;
    customCategoryName?: string;
    bookingId?: string;
    assignmentId?: string;
}
export declare class CreateSettlementCategoryDto {
    name: string;
    code: string;
    flowType: FeeFlowType;
}
export declare class UpdateSettlementDto {
    amount?: number;
    note?: string;
    imageUrl?: string;
    categoryId?: string;
    customCategoryName?: string;
}
export declare class QuerySettlementDto extends PaginationDto {
    bookingId?: string;
    assignmentId?: string;
    categoryId?: string;
}
