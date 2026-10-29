import { PaginationDto } from "../../common/dto/pagination.dto";
import { LeaveStatus, RoleType } from '@prisma/client';
import { type EmployeeGroup } from "../employee-group";
export declare class CreateLeaveDto {
    startDate: string;
    endDate: string;
    reason?: string;
    isEmergency?: boolean;
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
export declare class QueryTimesheetDto {
    from: string;
    to: string;
    role?: RoleType;
    roles?: RoleType[];
    groups?: EmployeeGroup[];
    search?: string;
    providerId?: string;
    providerIds?: string[];
    includeInactive?: boolean;
}
