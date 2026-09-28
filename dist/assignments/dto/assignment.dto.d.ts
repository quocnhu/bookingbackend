import { PaginationDto } from "../../common/dto/pagination.dto";
import { AssignmentOrigin, AssignmentStatus } from '@prisma/client';
export declare class CreateAssignmentDto {
    code?: string;
    tourName?: string;
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
    tourName?: string;
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
export declare class SetBoardOriginDto {
    origin: AssignmentOrigin;
}
export declare class AssignBookingsDto {
    bookingIds: string[];
}
export declare class ReorderBookingsDto {
    bookingIds: string[];
}
export declare class MoveBookingDto {
    toAssignmentId: string;
}
export declare class QueryAssignmentDto extends PaginationDto {
    status?: AssignmentStatus;
    vehicleId?: string;
    driverId?: string;
    guideId?: string;
    sortOrder?: 'asc' | 'desc';
}
export declare class SubmitTourReportDto {
    actualPax?: number;
    pickupNotes?: string;
    distanceKm?: number;
    fuelCost?: number;
    tollParking?: number;
    notes?: string;
    evidenceImages?: EvidenceImageDto[];
}
export declare class EvidenceImageDto {
    name?: string;
    url: string;
    ext?: string;
    uploadedAt?: string;
    uploadedByName?: string;
}
export declare class VerifyTourReportDto {
    status: 'VERIFIED' | 'REJECTED';
    verificationNotes?: string;
}
export declare class FinalizeServiceDto {
    categoryId?: string;
    name: string;
    amount: number;
}
export declare class BookingSettlementInputDto {
    bookingId: string;
    collect?: number;
    refund?: number;
}
export declare class FinalizeAssignmentDto {
    collectedAmount: number;
    refundedAmount?: number;
    services?: FinalizeServiceDto[];
    evidenceImages?: EvidenceImageDto[];
    bookingSettlements?: BookingSettlementInputDto[];
}
export declare class SettlementSummaryDto {
    from: string;
    to: string;
    guideId?: string;
    driverId?: string;
}
