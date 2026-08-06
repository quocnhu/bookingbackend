import { PaginationDto } from "../../common/dto/pagination.dto";
import { AssignmentStatus } from '@prisma/client';
export declare class CreateAssignmentDto {
    code?: string;
    startDate: string | Date;
    endDate: string | Date;
    vehicleId?: string;
    providerId?: string;
    driverId?: string;
    guideId?: string;
    status?: AssignmentStatus;
    sequenceIndex?: number;
    priceOverride?: number;
    tripNotes?: string;
}
export declare class UpdateAssignmentDto {
    code?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    vehicleId?: string;
    providerId?: string;
    driverId?: string;
    guideId?: string;
    status?: AssignmentStatus;
    sequenceIndex?: number;
    priceOverride?: number;
    tripNotes?: string;
}
export declare class UpdateAssignmentStatusDto {
    status: AssignmentStatus;
}
export declare class AssignBookingsDto {
    bookingIds: string[];
}
export declare class QueryAssignmentDto extends PaginationDto {
    q?: string;
    status?: AssignmentStatus;
    vehicleId?: string;
    driverId?: string;
    guideId?: string;
}
