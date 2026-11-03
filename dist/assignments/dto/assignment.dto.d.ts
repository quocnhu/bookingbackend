import { PaginationDto } from "../../common/dto/pagination.dto";
import { AssignmentExecutionMode, AssignmentOrigin, AssignmentStatus, PartnerMoneyFlow } from '@prisma/client';
export declare class CreateAssignmentDto {
    code?: string;
    tourName?: string;
    startDate: string | Date;
    endDate: string | Date;
    vehicleId?: string;
    providerId?: string;
    driverId?: string;
    guideId?: string;
    executionMode?: AssignmentExecutionMode;
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
    executionMode?: AssignmentExecutionMode;
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
export declare class UpdateAutoDispatchDto {
    enabled?: boolean;
    cron?: string;
}
export declare class UpdateRecallCutoffDto {
    time: string;
}
export declare class ConfirmPartnerHandoffDto {
    partnerId: string;
    contractRef?: string;
    amount: number;
    currency?: string;
    moneyFlow: PartnerMoneyFlow;
    note?: string;
}
export declare class ReturnPartnerHandoffDto {
    reason: string;
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
    storageKey?: string;
    size?: number;
    mimeType?: string;
    uploadedAt?: string;
    uploadedByName?: string;
}
export declare class VerifyTourReportDto {
    status: 'VERIFIED' | 'REJECTED';
    verificationNotes?: string;
}
export declare class FinalizeAssignmentDto {
    evidenceImages?: EvidenceImageDto[];
}
