import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AssignBookingsDto, CreateAssignmentDto, FinalizeAssignmentDto, QueryAssignmentDto, SubmitTourReportDto, UpdateAssignmentDto, UpdateAssignmentStatusDto, VerifyTourReportDto } from './dto/assignment.dto';
import { PaginatedResult } from "../common/dto/pagination.dto";
import { AssignmentOrigin, Prisma } from '@prisma/client';
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { AssignmentBoardService } from "../queues/assignment-board.service";
import { NotificationService } from "../notifications/notification.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { LeavesService } from "../leaves/leaves.service";
import type { FileStorage } from "../storage";
import { DriveService } from "../drive/drive.service";
export declare class AssignmentsService {
    private readonly prisma;
    private readonly auditService;
    private readonly board;
    private readonly notificationService;
    private readonly gateway;
    private readonly leavesService;
    private readonly storage;
    private readonly drive;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService, board: AssignmentBoardService, notificationService: NotificationService, gateway: NotificationsGateway, leavesService: LeavesService, storage: FileStorage, drive: DriveService);
    private include;
    findBoard(actor: AuthenticatedUser): Promise<any[]>;
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
                startDate: Date;
                endDate: Date;
                status: import("@prisma/client").$Enums.LeaveStatus;
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
                startDate: Date;
                endDate: Date;
                status: import("@prisma/client").$Enums.LeaveStatus;
            }[];
        }[];
    }>;
    private fetchLeaveMap;
    getCrewAvailability(from: Date, to: Date): Promise<{
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
                startDate: Date;
                endDate: Date;
                status: import("@prisma/client").$Enums.LeaveStatus;
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
                startDate: Date;
                endDate: Date;
                status: import("@prisma/client").$Enums.LeaveStatus;
            }[];
        }[];
    }>;
    dispatchAllBoard(): Promise<{
        dispatched: number;
        skipped: number;
        skippedOnLeave: number;
    }>;
    getBoardMode(): Promise<{
        mode: AssignmentOrigin;
    }>;
    setBoardOrigin(origin: AssignmentOrigin): Promise<{
        updated: number;
        mode: import("@prisma/client").$Enums.AssignmentOrigin;
    }>;
    private assertCrewAvailableForDates;
    private assertCrewNoOverlap;
    private assertProviderOwnsAssignment;
    private resolvePriceOverride;
    private decorateBoardCard;
    findAll(query: QueryAssignmentDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>>;
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
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: Prisma.Decimal | null;
            tollParking: Prisma.Decimal | null;
            notes: string | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: Prisma.Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: Prisma.JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: Prisma.Decimal | null;
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
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            totalPax: number;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            createdWho: string | null;
            assignmentId: string | null;
            notes: string | null;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            extra: Prisma.JsonValue | null;
            departureTime: string | null;
            rawDataId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            emailDate: Date | null;
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
        startDate: Date;
        endDate: Date;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        pickupInfo: Prisma.JsonValue | null;
        latitude: number | null;
        longitude: number | null;
        vehicleId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: Prisma.Decimal | null;
        tripNotes: string | null;
        createdWho: string | null;
    }>;
    private assertDetailsUnlocked;
    create(dto: CreateAssignmentDto, actor?: AuthenticatedUser): Promise<{
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
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: Prisma.Decimal | null;
            tollParking: Prisma.Decimal | null;
            notes: string | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: Prisma.Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: Prisma.JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: Prisma.Decimal | null;
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
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            totalPax: number;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            createdWho: string | null;
            assignmentId: string | null;
            notes: string | null;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            extra: Prisma.JsonValue | null;
            departureTime: string | null;
            rawDataId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            emailDate: Date | null;
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
        startDate: Date;
        endDate: Date;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        pickupInfo: Prisma.JsonValue | null;
        latitude: number | null;
        longitude: number | null;
        vehicleId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: Prisma.Decimal | null;
        tripNotes: string | null;
        createdWho: string | null;
    }>;
    update(id: string, dto: UpdateAssignmentDto, actor?: AuthenticatedUser): Promise<{
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
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: Prisma.Decimal | null;
            tollParking: Prisma.Decimal | null;
            notes: string | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: Prisma.Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: Prisma.JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: Prisma.Decimal | null;
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
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            totalPax: number;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            createdWho: string | null;
            assignmentId: string | null;
            notes: string | null;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            extra: Prisma.JsonValue | null;
            departureTime: string | null;
            rawDataId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            emailDate: Date | null;
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
        startDate: Date;
        endDate: Date;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        pickupInfo: Prisma.JsonValue | null;
        latitude: number | null;
        longitude: number | null;
        vehicleId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: Prisma.Decimal | null;
        tripNotes: string | null;
        createdWho: string | null;
    }>;
    private assertDispatchableToday;
    private assertCrewAssigned;
    private assertRecallAllowed;
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
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: Prisma.Decimal | null;
            tollParking: Prisma.Decimal | null;
            notes: string | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: Prisma.Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: Prisma.JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: Prisma.Decimal | null;
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
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            totalPax: number;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            createdWho: string | null;
            assignmentId: string | null;
            notes: string | null;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            extra: Prisma.JsonValue | null;
            departureTime: string | null;
            rawDataId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            emailDate: Date | null;
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
        startDate: Date;
        endDate: Date;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        pickupInfo: Prisma.JsonValue | null;
        latitude: number | null;
        longitude: number | null;
        vehicleId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: Prisma.Decimal | null;
        tripNotes: string | null;
        createdWho: string | null;
    }>;
    private sendStatusNotifications;
    assignBookings(id: string, dto: AssignBookingsDto, actor?: AuthenticatedUser): Promise<{
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
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: Prisma.Decimal | null;
            tollParking: Prisma.Decimal | null;
            notes: string | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: Prisma.Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: Prisma.JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: Prisma.Decimal | null;
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
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            totalPax: number;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            createdWho: string | null;
            assignmentId: string | null;
            notes: string | null;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            extra: Prisma.JsonValue | null;
            departureTime: string | null;
            rawDataId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            emailDate: Date | null;
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
        startDate: Date;
        endDate: Date;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        pickupInfo: Prisma.JsonValue | null;
        latitude: number | null;
        longitude: number | null;
        vehicleId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: Prisma.Decimal | null;
        tripNotes: string | null;
        createdWho: string | null;
    }>;
    removeBooking(id: string, bookingId: string, actor?: AuthenticatedUser): Promise<{
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
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: Prisma.Decimal | null;
            tollParking: Prisma.Decimal | null;
            notes: string | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: Prisma.Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: Prisma.JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: Prisma.Decimal | null;
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
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            totalPax: number;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            createdWho: string | null;
            assignmentId: string | null;
            notes: string | null;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            extra: Prisma.JsonValue | null;
            departureTime: string | null;
            rawDataId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            emailDate: Date | null;
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
        startDate: Date;
        endDate: Date;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        pickupInfo: Prisma.JsonValue | null;
        latitude: number | null;
        longitude: number | null;
        vehicleId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: Prisma.Decimal | null;
        tripNotes: string | null;
        createdWho: string | null;
    }>;
    reorderBookings(id: string, bookingIds: string[], actor?: AuthenticatedUser): Promise<{
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
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: Prisma.Decimal | null;
            tollParking: Prisma.Decimal | null;
            notes: string | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: Prisma.Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: Prisma.JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: Prisma.Decimal | null;
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
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            totalPax: number;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            createdWho: string | null;
            assignmentId: string | null;
            notes: string | null;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            extra: Prisma.JsonValue | null;
            departureTime: string | null;
            rawDataId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            emailDate: Date | null;
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
        startDate: Date;
        endDate: Date;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        pickupInfo: Prisma.JsonValue | null;
        latitude: number | null;
        longitude: number | null;
        vehicleId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: Prisma.Decimal | null;
        tripNotes: string | null;
        createdWho: string | null;
    }>;
    moveBooking(fromAssignmentId: string, bookingId: string, toAssignmentId: string, actor?: AuthenticatedUser): Promise<{
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
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: Prisma.Decimal | null;
            tollParking: Prisma.Decimal | null;
            notes: string | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: Prisma.Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: Prisma.JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: Prisma.Decimal | null;
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
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            totalPax: number;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            createdWho: string | null;
            assignmentId: string | null;
            notes: string | null;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            extra: Prisma.JsonValue | null;
            departureTime: string | null;
            rawDataId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            emailDate: Date | null;
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
        startDate: Date;
        endDate: Date;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        pickupInfo: Prisma.JsonValue | null;
        latitude: number | null;
        longitude: number | null;
        vehicleId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: Prisma.Decimal | null;
        tripNotes: string | null;
        createdWho: string | null;
    }>;
    private notifyMoveBooking;
    private refreshSummary;
    syncDatesFromBookings(assignmentId: string, actor?: AuthenticatedUser): Promise<{
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
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: Prisma.Decimal | null;
            tollParking: Prisma.Decimal | null;
            notes: string | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: Prisma.Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: Prisma.JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: Prisma.Decimal | null;
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
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            totalPax: number;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            createdWho: string | null;
            assignmentId: string | null;
            notes: string | null;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            extra: Prisma.JsonValue | null;
            departureTime: string | null;
            rawDataId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            emailDate: Date | null;
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
        startDate: Date;
        endDate: Date;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        pickupInfo: Prisma.JsonValue | null;
        latitude: number | null;
        longitude: number | null;
        vehicleId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: Prisma.Decimal | null;
        tripNotes: string | null;
        createdWho: string | null;
    }>;
    submitTourReport(id: string, dto: SubmitTourReportDto, actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TourReportStatus;
        assignmentId: string;
        submittedById: string | null;
        submittedByName: string | null;
        submittedAt: Date;
        actualPax: number | null;
        pickupNotes: string | null;
        distanceKm: number | null;
        fuelCost: Prisma.Decimal | null;
        tollParking: Prisma.Decimal | null;
        notes: string | null;
        verifiedById: string | null;
        verifiedByName: string | null;
        verifiedAt: Date | null;
        verificationNotes: string | null;
        finalizedById: string | null;
        finalizedByName: string | null;
        finalizedAt: Date | null;
        settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
        netAmount: Prisma.Decimal | null;
        moneyVerifiedById: string | null;
        moneyVerifiedByName: string | null;
        moneyVerifiedAt: Date | null;
        moneyVerificationNote: string | null;
        moneyPayableToId: string | null;
        moneyRejectedAt: Date | null;
        moneyRejectedById: string | null;
        moneyRejectedByName: string | null;
        moneyRejectionReason: string | null;
        evidenceImages: Prisma.JsonValue | null;
    }>;
    uploadReportImage(id: string, file: Express.Multer.File, actor: AuthenticatedUser): Promise<{
        name: string;
        url: string;
        ext: string;
        mimeType: string | null;
        size: number;
        storageKey: string;
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
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: Prisma.Decimal | null;
            tollParking: Prisma.Decimal | null;
            notes: string | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: Prisma.Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: Prisma.JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: Prisma.Decimal | null;
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
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            totalPax: number;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            createdWho: string | null;
            assignmentId: string | null;
            notes: string | null;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            extra: Prisma.JsonValue | null;
            departureTime: string | null;
            rawDataId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            emailDate: Date | null;
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
        startDate: Date;
        endDate: Date;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        pickupInfo: Prisma.JsonValue | null;
        latitude: number | null;
        longitude: number | null;
        vehicleId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: Prisma.Decimal | null;
        tripNotes: string | null;
        createdWho: string | null;
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
            assignmentId: string;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: Prisma.Decimal | null;
            tollParking: Prisma.Decimal | null;
            notes: string | null;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            verificationNotes: string | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            netAmount: Prisma.Decimal | null;
            moneyVerifiedById: string | null;
            moneyVerifiedByName: string | null;
            moneyVerifiedAt: Date | null;
            moneyVerificationNote: string | null;
            moneyPayableToId: string | null;
            moneyRejectedAt: Date | null;
            moneyRejectedById: string | null;
            moneyRejectedByName: string | null;
            moneyRejectionReason: string | null;
            evidenceImages: Prisma.JsonValue | null;
        } | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
        } | null;
        bookings: ({
            tour: {
                adultPrice: Prisma.Decimal | null;
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
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            totalPax: number;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            createdWho: string | null;
            assignmentId: string | null;
            notes: string | null;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            extra: Prisma.JsonValue | null;
            departureTime: string | null;
            rawDataId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            emailDate: Date | null;
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
        startDate: Date;
        endDate: Date;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        pickupInfo: Prisma.JsonValue | null;
        latitude: number | null;
        longitude: number | null;
        vehicleId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: Prisma.Decimal | null;
        tripNotes: string | null;
        createdWho: string | null;
    }>;
    findMyAssignments(actor: AuthenticatedUser): Promise<any[]>;
    findMyCalendar(actor: AuthenticatedUser, year?: number, month?: number): Promise<{
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
    findMyFleet(actor: AuthenticatedUser, startDate?: string, endDate?: string): Promise<{
        providerId: null;
        items: never[];
    } | {
        providerId: string;
        items: {
            id: string;
            code: string | null;
            tourName: string | null;
            status: import("@prisma/client").$Enums.AssignmentStatus;
            startDate: Date;
            endDate: Date;
            totalPax: number;
            tourType: import("@prisma/client").$Enums.TourType | null;
            vehicle: {
                id: string;
                plateNumber: string;
                capacity: number | null;
                brand: string | null;
            } | null;
            driver: {
                id: string;
                name: string | null;
                email: string;
            } | null;
            tourReport: {
                id: string;
                status: import("@prisma/client").$Enums.TourReportStatus;
            } | null;
        }[];
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
