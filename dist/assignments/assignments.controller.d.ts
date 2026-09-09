import { AssignmentsService } from './assignments.service';
import { AssignBookingsDto, CreateAssignmentDto, FinalizeAssignmentDto, MoveBookingDto, QueryAssignmentDto, ReorderBookingsDto, SetBoardOriginDto, SettlementSummaryDto, SubmitTourReportDto, UpdateAssignmentDto, UpdateAssignmentStatusDto, VerifyTourReportDto } from './dto/assignment.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class AssignmentsController {
    private readonly assignmentsService;
    constructor(assignmentsService: AssignmentsService);
    findAll(query: QueryAssignmentDto, actor: AuthenticatedUser): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findBoard(actor: AuthenticatedUser): Promise<any[]>;
    setBoardOrigin(dto: SetBoardOriginDto): Promise<{
        updated: number;
    }>;
    dispatchAllBoard(): Promise<{
        dispatched: number;
    }>;
    findMyAssignments(actor: AuthenticatedUser): Promise<any[]>;
    findMyCalendar(actor: AuthenticatedUser, year?: string, month?: string): Promise<{
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
    }[]>;
    findMyPayments(actor: AuthenticatedUser, startDate?: string, endDate?: string): Promise<{
        guideType: import("@prisma/client").$Enums.GuideType;
        startDate: Date;
        endDate: Date;
        summary: {
            tours: number;
            totalCollected: number;
            totalPaid: number;
            totalNet: number;
        };
        lines: {
            id: string;
            code: string | null;
            tourName: string | null;
            vehiclePlate: string | null;
            startDate: Date;
            endDate: Date;
            collected: number;
            paid: number;
            net: number;
            items: {
                id: string;
                category: string;
                flowType: import("@prisma/client").$Enums.FeeFlowType;
                amount: number;
                note: string | null;
            }[];
        }[];
    }>;
    settlementSummary(dto: SettlementSummaryDto): Promise<{
        from: string;
        to: string;
        guideId: string | undefined;
        driverId: string | undefined;
        guideName: string | null;
        driverName: string | null;
        summary: {
            guideReturnsToCompany: {
                count: number;
                total: number;
            };
            companyReturnsToGuide: {
                count: number;
                total: number;
            };
        };
        lines: {
            id: string;
            code: string;
            tourName: string | null;
            vehiclePlate: string | null;
            guide: string | null;
            driver: string | null;
            startDate: Date;
            endDate: Date;
            collectedAmount: number;
            servicesTotal: number;
            netAmount: number;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            places: string[];
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
            assignmentId: string;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            services: import("@prisma/client/runtime/library").JsonValue | null;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            servicesTotal: import("@prisma/client/runtime/library").Decimal | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
        } | null;
        provider: {
            id: string;
            name: string;
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
            settlements: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                assignmentId: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            startingDate: Date | null;
            totalPax: number;
            paxDetail: string | null;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            rawDataId: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        settlements: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            assignmentId: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        }[];
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
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        totalPax: number;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
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
            assignmentId: string;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            services: import("@prisma/client/runtime/library").JsonValue | null;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            servicesTotal: import("@prisma/client/runtime/library").Decimal | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
        } | null;
        provider: {
            id: string;
            name: string;
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
            settlements: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                assignmentId: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            startingDate: Date | null;
            totalPax: number;
            paxDetail: string | null;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            rawDataId: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        settlements: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            assignmentId: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        }[];
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
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        totalPax: number;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
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
            assignmentId: string;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            services: import("@prisma/client/runtime/library").JsonValue | null;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            servicesTotal: import("@prisma/client/runtime/library").Decimal | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
        } | null;
        provider: {
            id: string;
            name: string;
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
            settlements: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                assignmentId: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            startingDate: Date | null;
            totalPax: number;
            paxDetail: string | null;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            rawDataId: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        settlements: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            assignmentId: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        }[];
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
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        totalPax: number;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
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
            assignmentId: string;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            services: import("@prisma/client/runtime/library").JsonValue | null;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            servicesTotal: import("@prisma/client/runtime/library").Decimal | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
        } | null;
        provider: {
            id: string;
            name: string;
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
            settlements: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                assignmentId: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            startingDate: Date | null;
            totalPax: number;
            paxDetail: string | null;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            rawDataId: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        settlements: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            assignmentId: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        }[];
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
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        totalPax: number;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
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
            assignmentId: string;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            services: import("@prisma/client/runtime/library").JsonValue | null;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            servicesTotal: import("@prisma/client/runtime/library").Decimal | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
        } | null;
        provider: {
            id: string;
            name: string;
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
            settlements: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                assignmentId: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            startingDate: Date | null;
            totalPax: number;
            paxDetail: string | null;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            rawDataId: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        settlements: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            assignmentId: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        }[];
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
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        totalPax: number;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
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
            assignmentId: string;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            services: import("@prisma/client/runtime/library").JsonValue | null;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            servicesTotal: import("@prisma/client/runtime/library").Decimal | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
        } | null;
        provider: {
            id: string;
            name: string;
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
            settlements: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                assignmentId: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            startingDate: Date | null;
            totalPax: number;
            paxDetail: string | null;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            rawDataId: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        settlements: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            assignmentId: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        }[];
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
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        totalPax: number;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
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
            assignmentId: string;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            services: import("@prisma/client/runtime/library").JsonValue | null;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            servicesTotal: import("@prisma/client/runtime/library").Decimal | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
        } | null;
        provider: {
            id: string;
            name: string;
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
            settlements: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                assignmentId: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            startingDate: Date | null;
            totalPax: number;
            paxDetail: string | null;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            rawDataId: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        settlements: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            assignmentId: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        }[];
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
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        totalPax: number;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
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
            assignmentId: string;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            services: import("@prisma/client/runtime/library").JsonValue | null;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            servicesTotal: import("@prisma/client/runtime/library").Decimal | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
        } | null;
        provider: {
            id: string;
            name: string;
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
            settlements: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                assignmentId: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            startingDate: Date | null;
            totalPax: number;
            paxDetail: string | null;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            rawDataId: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        settlements: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            assignmentId: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        }[];
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
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        totalPax: number;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
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
        assignmentId: string;
        actualPax: number | null;
        pickupNotes: string | null;
        distanceKm: number | null;
        fuelCost: import("@prisma/client/runtime/library").Decimal | null;
        tollParking: import("@prisma/client/runtime/library").Decimal | null;
        notes: string | null;
        verificationNotes: string | null;
        collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
        services: import("@prisma/client/runtime/library").JsonValue | null;
        submittedById: string | null;
        submittedByName: string | null;
        submittedAt: Date;
        verifiedById: string | null;
        verifiedByName: string | null;
        verifiedAt: Date | null;
        servicesTotal: import("@prisma/client/runtime/library").Decimal | null;
        netAmount: import("@prisma/client/runtime/library").Decimal | null;
        settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
        finalizedById: string | null;
        finalizedByName: string | null;
        finalizedAt: Date | null;
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
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            services: import("@prisma/client/runtime/library").JsonValue | null;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            servicesTotal: import("@prisma/client/runtime/library").Decimal | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
        } | null;
        provider: {
            id: string;
            name: string;
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
            settlements: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                assignmentId: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            startingDate: Date | null;
            totalPax: number;
            paxDetail: string | null;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            rawDataId: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        settlements: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            assignmentId: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        }[];
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
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        totalPax: number;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
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
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            services: import("@prisma/client/runtime/library").JsonValue | null;
            submittedById: string | null;
            submittedByName: string | null;
            submittedAt: Date;
            verifiedById: string | null;
            verifiedByName: string | null;
            verifiedAt: Date | null;
            servicesTotal: import("@prisma/client/runtime/library").Decimal | null;
            netAmount: import("@prisma/client/runtime/library").Decimal | null;
            settlementFlow: import("@prisma/client").$Enums.FeeFlowType | null;
            finalizedById: string | null;
            finalizedByName: string | null;
            finalizedAt: Date | null;
        } | null;
        provider: {
            id: string;
            name: string;
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
            settlements: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                assignmentId: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            startingDate: Date | null;
            totalPax: number;
            paxDetail: string | null;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            rawDataId: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        settlements: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            assignmentId: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        }[];
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
    } & {
        id: string;
        createdAt: Date;
        providerId: string | null;
        updatedAt: Date;
        code: string | null;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        durationDays: number | null;
        vehicleId: string | null;
        totalPax: number;
        tourName: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        latitude: number | null;
        longitude: number | null;
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
