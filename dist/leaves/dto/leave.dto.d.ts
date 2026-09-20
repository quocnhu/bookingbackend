import { PaginationDto } from '@/common/dto/pagination.dto';
import { LeaveStatus } from '@prisma/client';
export declare class CreateLeaveDto {
    startDate: string;
    endDate: string;
    reason?: string;
    userId?: string;
}
export declare class UpdateLeaveStatusDto {
    status: LeaveStatus;
}
export declare class QueryLeaveDto extends PaginationDto {
    status?: LeaveStatus;
    userId?: string;
    search?: string;
    reason?: string;
    reviewedBy?: string;
    from?: string;
    to?: string;
    createdFrom?: string;
    createdTo?: string;
}
