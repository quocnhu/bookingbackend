import { AssignmentsService } from './assignments.service';
import { AccountingService } from "../accounting/accounting.service";
import { CreateSettlementDto } from "../accounting/dto/accounting.dto";
import { AssignBookingsDto, CreateAssignmentDto, FinalizeAssignmentDto, MoveBookingDto, QueryAssignmentDto, ReorderBookingsDto, SetBoardOriginDto, SubmitTourReportDto, UpdateAssignmentDto, UpdateAssignmentStatusDto, VerifyTourReportDto } from './dto/assignment.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class AssignmentsController {
    private readonly assignmentsService;
    private readonly accountingService;
    constructor(assignmentsService: AssignmentsService, accountingService: AccountingService);
    findAll(query: QueryAssignmentDto, actor: AuthenticatedUser): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findBoard(actor: AuthenticatedUser): Promise<any[]>;
    getBoardMode(): Promise<{
        mode: import("@prisma/client").AssignmentOrigin;
    }>;
    setBoardOrigin(dto: SetBoardOriginDto): Promise<{
        updated: number;
        mode: import("@prisma/client").$Enums.AssignmentOrigin;
    }>;
    dispatchAllBoard(): Promise<{
        dispatched: number;
        skipped: number;
        skippedOnLeave: number;
    }>;
    getBoardCrew(): Promise<{
        guides: {
            id: string;
            name: string | null;
            email: string;
            type: import("@prisma/client").$Enums.GuideType;
            languages: string[];
            rating: number | null;
            isBusy: boolean;
            leaves: {
                id: string;
                userId: string;
                status: import("@prisma/client").$Enums.LeaveStatus;
                startDate: Date;
                endDate: Date;
            }[];
        }[];
        drivers: {
            id: string;
            name: string | null;
            email: string;
            rating: number | null;
            provider: {
                id: string;
                name: string;
            } | null;
            isBusy: boolean;
            leaves: {
                id: string;
                userId: string;
                status: import("@prisma/client").$Enums.LeaveStatus;
                startDate: Date;
                endDate: Date;
            }[];
        }[];
    }>;
    getCrewAvailability(from?: string, to?: string): Promise<{
        from: Date;
        to: Date;
        guides: {
            id: string;
            name: string | null;
            email: string;
            type: import("@prisma/client").$Enums.GuideType;
            rating: number | null;
            assignments: {
                id: string;
                code: string | null;
                tourName: string | null;
                status: import("@prisma/client").$Enums.AssignmentStatus;
                startDate: Date;
                endDate: Date;
                plateNumber: string | null;
                paid: boolean;
                moneyVerifiedAt: Date | null;
                paidToName: string | null;
            }[];
            leaves: {
                id: string;
                userId: string;
                status: import("@prisma/client").$Enums.LeaveStatus;
                startDate: Date;
                endDate: Date;
            }[];
        }[];
        drivers: {
            id: string;
            name: string | null;
            email: string;
            rating: number | null;
            provider: {
                id: string;
                name: string;
            } | null;
            assignments: {
                id: string;
                code: string | null;
                tourName: string | null;
                status: import("@prisma/client").$Enums.AssignmentStatus;
                startDate: Date;
                endDate: Date;
                plateNumber: string | null;
                paid: boolean;
                moneyVerifiedAt: Date | null;
                paidToName: string | null;
            }[];
            leaves: {
                id: string;
                userId: string;
                status: import("@prisma/client").$Enums.LeaveStatus;
                startDate: Date;
                endDate: Date;
            }[];
        }[];
    }>;
    findMyAssignments(actor: AuthenticatedUser): Promise<any[]>;
    findMyCalendar(actor: AuthenticatedUser, year?: string, month?: string): Promise<{
        assignments: {
            id: string;
            code: string | null;
            tourName: string;
            status: import("@prisma/client").$Enums.AssignmentStatus;
            startDate: Date;
            endDate: Date;
            tourType: import("@prisma/client").$Enums.TourType | null;
            durationDays: number | null;
            vehiclePlate: string | null;
            isDriver: boolean;
            isGuide: boolean;
        }[];
        leaves: {
            id: string;
            startDate: Date;
            endDate: Date;
            status: import("@prisma/client").$Enums.LeaveStatus;
            reason: string | null;
        }[];
    }>;
    findOne(id: string): Promise<{
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        tourReport: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                vehicle: {
                    plateNumber: string;
                } | null;
                code: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            startingDate: Date | null;
            bookingRef: string;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            confirmationCode: string | null;
            rawDataId: string | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        driver: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        reportVerifier: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        paymentLines: {
            id: string;
            periodId: string;
            payableToId: string;
            tourDate: Date;
            payableTo: {
                id: string;
                name: string | null;
            };
        }[];
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
        totalPax: number;
        createdWho: string | null;
        startDate: Date;
        endDate: Date;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    create(dto: CreateAssignmentDto, actor: AuthenticatedUser): Promise<{
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        tourReport: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                vehicle: {
                    plateNumber: string;
                } | null;
                code: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            startingDate: Date | null;
            bookingRef: string;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            confirmationCode: string | null;
            rawDataId: string | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        driver: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        reportVerifier: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        paymentLines: {
            id: string;
            periodId: string;
            payableToId: string;
            tourDate: Date;
            payableTo: {
                id: string;
                name: string | null;
            };
        }[];
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
        totalPax: number;
        createdWho: string | null;
        startDate: Date;
        endDate: Date;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    update(id: string, dto: UpdateAssignmentDto): Promise<{
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        tourReport: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                vehicle: {
                    plateNumber: string;
                } | null;
                code: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            startingDate: Date | null;
            bookingRef: string;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            confirmationCode: string | null;
            rawDataId: string | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        driver: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        reportVerifier: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        paymentLines: {
            id: string;
            periodId: string;
            payableToId: string;
            tourDate: Date;
            payableTo: {
                id: string;
                name: string | null;
            };
        }[];
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
        totalPax: number;
        createdWho: string | null;
        startDate: Date;
        endDate: Date;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    updateStatus(id: string, dto: UpdateAssignmentStatusDto): Promise<{
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        tourReport: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                vehicle: {
                    plateNumber: string;
                } | null;
                code: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            startingDate: Date | null;
            bookingRef: string;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            confirmationCode: string | null;
            rawDataId: string | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        driver: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        reportVerifier: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        paymentLines: {
            id: string;
            periodId: string;
            payableToId: string;
            tourDate: Date;
            payableTo: {
                id: string;
                name: string | null;
            };
        }[];
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
        totalPax: number;
        createdWho: string | null;
        startDate: Date;
        endDate: Date;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    reorderBookings(id: string, dto: ReorderBookingsDto): Promise<{
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        tourReport: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                vehicle: {
                    plateNumber: string;
                } | null;
                code: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            startingDate: Date | null;
            bookingRef: string;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            confirmationCode: string | null;
            rawDataId: string | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        driver: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        reportVerifier: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        paymentLines: {
            id: string;
            periodId: string;
            payableToId: string;
            tourDate: Date;
            payableTo: {
                id: string;
                name: string | null;
            };
        }[];
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
        totalPax: number;
        createdWho: string | null;
        startDate: Date;
        endDate: Date;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    moveBooking(id: string, bookingId: string, dto: MoveBookingDto): Promise<{
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        tourReport: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                vehicle: {
                    plateNumber: string;
                } | null;
                code: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            startingDate: Date | null;
            bookingRef: string;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            confirmationCode: string | null;
            rawDataId: string | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        driver: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        reportVerifier: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        paymentLines: {
            id: string;
            periodId: string;
            payableToId: string;
            tourDate: Date;
            payableTo: {
                id: string;
                name: string | null;
            };
        }[];
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
        totalPax: number;
        createdWho: string | null;
        startDate: Date;
        endDate: Date;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    assignBookings(id: string, dto: AssignBookingsDto): Promise<{
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        tourReport: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                vehicle: {
                    plateNumber: string;
                } | null;
                code: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            startingDate: Date | null;
            bookingRef: string;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            confirmationCode: string | null;
            rawDataId: string | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        driver: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        reportVerifier: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        paymentLines: {
            id: string;
            periodId: string;
            payableToId: string;
            tourDate: Date;
            payableTo: {
                id: string;
                name: string | null;
            };
        }[];
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
        totalPax: number;
        createdWho: string | null;
        startDate: Date;
        endDate: Date;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    removeBooking(id: string, bookingId: string): Promise<{
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        tourReport: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                vehicle: {
                    plateNumber: string;
                } | null;
                code: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            startingDate: Date | null;
            bookingRef: string;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            confirmationCode: string | null;
            rawDataId: string | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        driver: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        reportVerifier: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        paymentLines: {
            id: string;
            periodId: string;
            payableToId: string;
            tourDate: Date;
            payableTo: {
                id: string;
                name: string | null;
            };
        }[];
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
        totalPax: number;
        createdWho: string | null;
        startDate: Date;
        endDate: Date;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    syncDatesFromBookings(id: string): Promise<{
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        tourReport: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                vehicle: {
                    plateNumber: string;
                } | null;
                code: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            startingDate: Date | null;
            bookingRef: string;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            confirmationCode: string | null;
            rawDataId: string | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        driver: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        reportVerifier: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        paymentLines: {
            id: string;
            periodId: string;
            payableToId: string;
            tourDate: Date;
            payableTo: {
                id: string;
                name: string | null;
            };
        }[];
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
        totalPax: number;
        createdWho: string | null;
        startDate: Date;
        endDate: Date;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    submitTourReport(id: string, dto: SubmitTourReportDto, actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TourReportStatus;
        notes: string | null;
        assignmentId: string;
        submittedById: string | null;
        submittedByName: string | null;
        submittedAt: Date;
        actualPax: number | null;
        pickupNotes: string | null;
        distanceKm: number | null;
        fuelCost: import("@prisma/client/runtime/library").Decimal | null;
        tollParking: import("@prisma/client/runtime/library").Decimal | null;
        verifiedById: string | null;
        verifiedByName: string | null;
        verifiedAt: Date | null;
        verificationNotes: string | null;
        finalizedById: string | null;
        finalizedByName: string | null;
        finalizedAt: Date | null;
        settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
        netAmount: import("@prisma/client/runtime/library").Decimal | null;
        moneyVerifiedById: string | null;
        moneyVerifiedByName: string | null;
        moneyVerifiedAt: Date | null;
        moneyVerificationNote: string | null;
        moneyPayableToId: string | null;
        moneyRejectedAt: Date | null;
        moneyRejectedById: string | null;
        moneyRejectedByName: string | null;
        moneyRejectionReason: string | null;
        evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    uploadTourReportImage(id: string, file: Express.Multer.File, actor: AuthenticatedUser): Promise<{
        name: string;
        url: string;
        ext: string;
        uploadedAt: string;
        uploadedByName: string;
    }>;
    verifyTourReport(id: string, dto: VerifyTourReportDto, actor: AuthenticatedUser): Promise<{
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        tourReport: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                vehicle: {
                    plateNumber: string;
                } | null;
                code: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            startingDate: Date | null;
            bookingRef: string;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            confirmationCode: string | null;
            rawDataId: string | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        driver: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        reportVerifier: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        paymentLines: {
            id: string;
            periodId: string;
            payableToId: string;
            tourDate: Date;
            payableTo: {
                id: string;
                name: string | null;
            };
        }[];
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
        totalPax: number;
        createdWho: string | null;
        startDate: Date;
        endDate: Date;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    tourMoney(id: string, actor: AuthenticatedUser): Promise<{
        locked: boolean;
        lockedBy: string | null;
        returnedForRecheck: boolean;
        collected: number;
        paid: number;
        net: number;
        flow: "COLLECT_MONEY" | "PAY_MONEY";
        entryCount: number;
        rows: ({
            booking: {
                id: string;
                bookingRef: string;
                customerName: string | null;
                totalPax: number;
            } | null;
            category: {
                id: string;
                name: string;
                code: string;
                flowType: import("@prisma/client").$Enums.FeeFlowType;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            assignmentId: string | null;
            bookingId: string | null;
            note: string | null;
            createdById: string;
            createdByName: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            categoryId: string | null;
            reversesId: string | null;
        })[];
        categories: {
            id: string;
            name: string;
            code: string;
            flowType: import("@prisma/client").$Enums.FeeFlowType;
        }[];
    }>;
    addTourMoney(id: string, dto: CreateSettlementDto, actor: AuthenticatedUser): Promise<{
        category: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            isSystem: boolean;
            code: string;
            flowType: import("@prisma/client").$Enums.FeeFlowType;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        assignmentId: string | null;
        bookingId: string | null;
        note: string | null;
        createdById: string;
        createdByName: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        categoryId: string | null;
        reversesId: string | null;
    }>;
    deleteTourMoney(id: string, settlementId: string, actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        assignmentId: string | null;
        bookingId: string | null;
        note: string | null;
        createdById: string;
        createdByName: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        categoryId: string | null;
        reversesId: string | null;
    }>;
    finalize(id: string, dto: FinalizeAssignmentDto, actor: AuthenticatedUser): Promise<{
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        tourReport: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                vehicle: {
                    plateNumber: string;
                } | null;
                code: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            startingDate: Date | null;
            bookingRef: string;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            confirmationCode: string | null;
            rawDataId: string | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        driver: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        reportVerifier: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        paymentLines: {
            id: string;
            periodId: string;
            payableToId: string;
            tourDate: Date;
            payableTo: {
                id: string;
                name: string | null;
            };
        }[];
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
        totalPax: number;
        createdWho: string | null;
        startDate: Date;
        endDate: Date;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
}
