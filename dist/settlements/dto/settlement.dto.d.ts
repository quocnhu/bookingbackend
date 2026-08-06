import { PaginationDto } from "../../common/dto/pagination.dto";
import { PayeeType, SettlementStatus } from '@prisma/client';
export declare class CreateSettlementDto {
    assignmentId: string;
    payeeType: PayeeType;
    providerId?: string;
    userId?: string;
    baseAmount: number;
    allowance?: number;
    deduction?: number;
    periodName?: string;
    notes?: string;
    expenseItems?: ExpenseItemDto[];
}
export declare class ExpenseItemDto {
    category: string;
    description?: string;
    amount: number;
    receiptUrl?: string;
}
export declare class UpdateSettlementDto {
    status?: SettlementStatus;
    allowance?: number;
    deduction?: number;
    periodName?: string;
    notes?: string;
}
export declare class QuerySettlementDto extends PaginationDto {
    status?: SettlementStatus;
    payeeType?: PayeeType;
}
