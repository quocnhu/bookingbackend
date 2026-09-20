import { AssignmentsService } from './assignments.service';
import { AssignBookingsDto, CreateAssignmentDto, FinalizeAssignmentDto, MoveBookingDto, QueryAssignmentDto, ReorderBookingsDto, SetBoardOriginDto, SettlementSummaryDto, SubmitTourReportDto, UpdateAssignmentDto, UpdateAssignmentStatusDto, VerifyTourReportDto } from './dto/assignment.dto';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
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
                status: import("@prisma/client").$Enums.LeaveStatus;
                startDate: Date;
                endDate: Date;
                userId: string;
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
                status: import("@prisma/client").$Enums.LeaveStatus;
                startDate: Date;
                endDate: Date;
                userId: string;
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
            }[];
            leaves: {
                id: string;
                status: import("@prisma/client").$Enums.LeaveStatus;
                startDate: Date;
                endDate: Date;
                userId: string;
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
            }[];
            leaves: {
                id: string;
                status: import("@prisma/client").$Enums.LeaveStatus;
                startDate: Date;
                endDate: Date;
                userId: string;
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
        settlements: ({
            category: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                isSystem: boolean;
                flowType: import("@prisma/client").$Enums.FeeFlowType;
            } | null;
        } & {
            id: string;
            assignmentId: string | null;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        })[];
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                code: string | null;
                vehicle: {
                    plateNumber: string;
                } | null;
            } | null;
            settlements: ({
                category: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    code: string;
                    isSystem: boolean;
                    flowType: import("@prisma/client").$Enums.FeeFlowType;
                } | null;
            } & {
                id: string;
                assignmentId: string | null;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            })[];
        } & {
            latitude: number | null;
            longitude: number | null;
            id: string;
            bookingRef: string;
            rawDataId: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            source: string | null;
            confirmationCode: string | null;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            collectAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
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
        tourReport: {
            id: string;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            createdAt: Date;
            updatedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundedAmount: import("@prisma/client/runtime/library").Decimal | null;
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
    } & {
        latitude: number | null;
        longitude: number | null;
        id: string;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        totalPax: number;
        tourType: import("@prisma/client").$Enums.TourType | null;
        tourName: string | null;
        createdWho: string | null;
        createdAt: Date;
        updatedAt: Date;
        code: string | null;
        startDate: Date;
        endDate: Date;
        durationDays: number | null;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        vehicleId: string | null;
        providerId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    create(dto: CreateAssignmentDto, actor: AuthenticatedUser): Promise<{
        settlements: ({
            category: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                isSystem: boolean;
                flowType: import("@prisma/client").$Enums.FeeFlowType;
            } | null;
        } & {
            id: string;
            assignmentId: string | null;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        })[];
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                code: string | null;
                vehicle: {
                    plateNumber: string;
                } | null;
            } | null;
            settlements: ({
                category: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    code: string;
                    isSystem: boolean;
                    flowType: import("@prisma/client").$Enums.FeeFlowType;
                } | null;
            } & {
                id: string;
                assignmentId: string | null;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            })[];
        } & {
            latitude: number | null;
            longitude: number | null;
            id: string;
            bookingRef: string;
            rawDataId: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            source: string | null;
            confirmationCode: string | null;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            collectAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
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
        tourReport: {
            id: string;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            createdAt: Date;
            updatedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundedAmount: import("@prisma/client/runtime/library").Decimal | null;
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
    } & {
        latitude: number | null;
        longitude: number | null;
        id: string;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        totalPax: number;
        tourType: import("@prisma/client").$Enums.TourType | null;
        tourName: string | null;
        createdWho: string | null;
        createdAt: Date;
        updatedAt: Date;
        code: string | null;
        startDate: Date;
        endDate: Date;
        durationDays: number | null;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        vehicleId: string | null;
        providerId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    update(id: string, dto: UpdateAssignmentDto): Promise<{
        settlements: ({
            category: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                isSystem: boolean;
                flowType: import("@prisma/client").$Enums.FeeFlowType;
            } | null;
        } & {
            id: string;
            assignmentId: string | null;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        })[];
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                code: string | null;
                vehicle: {
                    plateNumber: string;
                } | null;
            } | null;
            settlements: ({
                category: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    code: string;
                    isSystem: boolean;
                    flowType: import("@prisma/client").$Enums.FeeFlowType;
                } | null;
            } & {
                id: string;
                assignmentId: string | null;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            })[];
        } & {
            latitude: number | null;
            longitude: number | null;
            id: string;
            bookingRef: string;
            rawDataId: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            source: string | null;
            confirmationCode: string | null;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            collectAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
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
        tourReport: {
            id: string;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            createdAt: Date;
            updatedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundedAmount: import("@prisma/client/runtime/library").Decimal | null;
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
    } & {
        latitude: number | null;
        longitude: number | null;
        id: string;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        totalPax: number;
        tourType: import("@prisma/client").$Enums.TourType | null;
        tourName: string | null;
        createdWho: string | null;
        createdAt: Date;
        updatedAt: Date;
        code: string | null;
        startDate: Date;
        endDate: Date;
        durationDays: number | null;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        vehicleId: string | null;
        providerId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    updateStatus(id: string, dto: UpdateAssignmentStatusDto): Promise<{
        settlements: ({
            category: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                isSystem: boolean;
                flowType: import("@prisma/client").$Enums.FeeFlowType;
            } | null;
        } & {
            id: string;
            assignmentId: string | null;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        })[];
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                code: string | null;
                vehicle: {
                    plateNumber: string;
                } | null;
            } | null;
            settlements: ({
                category: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    code: string;
                    isSystem: boolean;
                    flowType: import("@prisma/client").$Enums.FeeFlowType;
                } | null;
            } & {
                id: string;
                assignmentId: string | null;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            })[];
        } & {
            latitude: number | null;
            longitude: number | null;
            id: string;
            bookingRef: string;
            rawDataId: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            source: string | null;
            confirmationCode: string | null;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            collectAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
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
        tourReport: {
            id: string;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            createdAt: Date;
            updatedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundedAmount: import("@prisma/client/runtime/library").Decimal | null;
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
    } & {
        latitude: number | null;
        longitude: number | null;
        id: string;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        totalPax: number;
        tourType: import("@prisma/client").$Enums.TourType | null;
        tourName: string | null;
        createdWho: string | null;
        createdAt: Date;
        updatedAt: Date;
        code: string | null;
        startDate: Date;
        endDate: Date;
        durationDays: number | null;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        vehicleId: string | null;
        providerId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    reorderBookings(id: string, dto: ReorderBookingsDto): Promise<{
        settlements: ({
            category: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                isSystem: boolean;
                flowType: import("@prisma/client").$Enums.FeeFlowType;
            } | null;
        } & {
            id: string;
            assignmentId: string | null;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        })[];
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                code: string | null;
                vehicle: {
                    plateNumber: string;
                } | null;
            } | null;
            settlements: ({
                category: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    code: string;
                    isSystem: boolean;
                    flowType: import("@prisma/client").$Enums.FeeFlowType;
                } | null;
            } & {
                id: string;
                assignmentId: string | null;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            })[];
        } & {
            latitude: number | null;
            longitude: number | null;
            id: string;
            bookingRef: string;
            rawDataId: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            source: string | null;
            confirmationCode: string | null;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            collectAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
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
        tourReport: {
            id: string;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            createdAt: Date;
            updatedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundedAmount: import("@prisma/client/runtime/library").Decimal | null;
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
    } & {
        latitude: number | null;
        longitude: number | null;
        id: string;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        totalPax: number;
        tourType: import("@prisma/client").$Enums.TourType | null;
        tourName: string | null;
        createdWho: string | null;
        createdAt: Date;
        updatedAt: Date;
        code: string | null;
        startDate: Date;
        endDate: Date;
        durationDays: number | null;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        vehicleId: string | null;
        providerId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    moveBooking(id: string, bookingId: string, dto: MoveBookingDto): Promise<{
        settlements: ({
            category: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                isSystem: boolean;
                flowType: import("@prisma/client").$Enums.FeeFlowType;
            } | null;
        } & {
            id: string;
            assignmentId: string | null;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        })[];
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                code: string | null;
                vehicle: {
                    plateNumber: string;
                } | null;
            } | null;
            settlements: ({
                category: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    code: string;
                    isSystem: boolean;
                    flowType: import("@prisma/client").$Enums.FeeFlowType;
                } | null;
            } & {
                id: string;
                assignmentId: string | null;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            })[];
        } & {
            latitude: number | null;
            longitude: number | null;
            id: string;
            bookingRef: string;
            rawDataId: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            source: string | null;
            confirmationCode: string | null;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            collectAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
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
        tourReport: {
            id: string;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            createdAt: Date;
            updatedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundedAmount: import("@prisma/client/runtime/library").Decimal | null;
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
    } & {
        latitude: number | null;
        longitude: number | null;
        id: string;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        totalPax: number;
        tourType: import("@prisma/client").$Enums.TourType | null;
        tourName: string | null;
        createdWho: string | null;
        createdAt: Date;
        updatedAt: Date;
        code: string | null;
        startDate: Date;
        endDate: Date;
        durationDays: number | null;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        vehicleId: string | null;
        providerId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    assignBookings(id: string, dto: AssignBookingsDto): Promise<{
        settlements: ({
            category: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                isSystem: boolean;
                flowType: import("@prisma/client").$Enums.FeeFlowType;
            } | null;
        } & {
            id: string;
            assignmentId: string | null;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        })[];
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                code: string | null;
                vehicle: {
                    plateNumber: string;
                } | null;
            } | null;
            settlements: ({
                category: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    code: string;
                    isSystem: boolean;
                    flowType: import("@prisma/client").$Enums.FeeFlowType;
                } | null;
            } & {
                id: string;
                assignmentId: string | null;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            })[];
        } & {
            latitude: number | null;
            longitude: number | null;
            id: string;
            bookingRef: string;
            rawDataId: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            source: string | null;
            confirmationCode: string | null;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            collectAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
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
        tourReport: {
            id: string;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            createdAt: Date;
            updatedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundedAmount: import("@prisma/client/runtime/library").Decimal | null;
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
    } & {
        latitude: number | null;
        longitude: number | null;
        id: string;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        totalPax: number;
        tourType: import("@prisma/client").$Enums.TourType | null;
        tourName: string | null;
        createdWho: string | null;
        createdAt: Date;
        updatedAt: Date;
        code: string | null;
        startDate: Date;
        endDate: Date;
        durationDays: number | null;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        vehicleId: string | null;
        providerId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    removeBooking(id: string, bookingId: string): Promise<{
        settlements: ({
            category: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                isSystem: boolean;
                flowType: import("@prisma/client").$Enums.FeeFlowType;
            } | null;
        } & {
            id: string;
            assignmentId: string | null;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        })[];
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                code: string | null;
                vehicle: {
                    plateNumber: string;
                } | null;
            } | null;
            settlements: ({
                category: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    code: string;
                    isSystem: boolean;
                    flowType: import("@prisma/client").$Enums.FeeFlowType;
                } | null;
            } & {
                id: string;
                assignmentId: string | null;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            })[];
        } & {
            latitude: number | null;
            longitude: number | null;
            id: string;
            bookingRef: string;
            rawDataId: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            source: string | null;
            confirmationCode: string | null;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            collectAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
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
        tourReport: {
            id: string;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            createdAt: Date;
            updatedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundedAmount: import("@prisma/client/runtime/library").Decimal | null;
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
    } & {
        latitude: number | null;
        longitude: number | null;
        id: string;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        totalPax: number;
        tourType: import("@prisma/client").$Enums.TourType | null;
        tourName: string | null;
        createdWho: string | null;
        createdAt: Date;
        updatedAt: Date;
        code: string | null;
        startDate: Date;
        endDate: Date;
        durationDays: number | null;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        vehicleId: string | null;
        providerId: string | null;
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
        status: import("@prisma/client").$Enums.TourReportStatus;
        notes: string | null;
        assignmentId: string;
        createdAt: Date;
        updatedAt: Date;
        actualPax: number | null;
        pickupNotes: string | null;
        distanceKm: number | null;
        fuelCost: import("@prisma/client/runtime/library").Decimal | null;
        tollParking: import("@prisma/client/runtime/library").Decimal | null;
        evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
        verificationNotes: string | null;
        collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
        refundedAmount: import("@prisma/client/runtime/library").Decimal | null;
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
    uploadTourReportImage(id: string, file: Express.Multer.File, actor: AuthenticatedUser): Promise<{
        name: string;
        url: string;
        ext: string;
        uploadedAt: string;
        uploadedByName: string;
    }>;
    verifyTourReport(id: string, dto: VerifyTourReportDto, actor: AuthenticatedUser): Promise<{
        settlements: ({
            category: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                isSystem: boolean;
                flowType: import("@prisma/client").$Enums.FeeFlowType;
            } | null;
        } & {
            id: string;
            assignmentId: string | null;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        })[];
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                code: string | null;
                vehicle: {
                    plateNumber: string;
                } | null;
            } | null;
            settlements: ({
                category: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    code: string;
                    isSystem: boolean;
                    flowType: import("@prisma/client").$Enums.FeeFlowType;
                } | null;
            } & {
                id: string;
                assignmentId: string | null;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            })[];
        } & {
            latitude: number | null;
            longitude: number | null;
            id: string;
            bookingRef: string;
            rawDataId: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            source: string | null;
            confirmationCode: string | null;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            collectAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
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
        tourReport: {
            id: string;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            createdAt: Date;
            updatedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundedAmount: import("@prisma/client/runtime/library").Decimal | null;
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
    } & {
        latitude: number | null;
        longitude: number | null;
        id: string;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        totalPax: number;
        tourType: import("@prisma/client").$Enums.TourType | null;
        tourName: string | null;
        createdWho: string | null;
        createdAt: Date;
        updatedAt: Date;
        code: string | null;
        startDate: Date;
        endDate: Date;
        durationDays: number | null;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        vehicleId: string | null;
        providerId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    finalize(id: string, dto: FinalizeAssignmentDto, actor: AuthenticatedUser): Promise<{
        settlements: ({
            category: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                isSystem: boolean;
                flowType: import("@prisma/client").$Enums.FeeFlowType;
            } | null;
        } & {
            id: string;
            assignmentId: string | null;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            bookingId: string | null;
            categoryId: string | null;
            amount: number;
            note: string | null;
            customCategoryName: string | null;
            createdById: string;
        })[];
        bookings: ({
            tour: {
                adultPrice: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
            movedFromBus: {
                code: string | null;
                vehicle: {
                    plateNumber: string;
                } | null;
            } | null;
            settlements: ({
                category: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    code: string;
                    isSystem: boolean;
                    flowType: import("@prisma/client").$Enums.FeeFlowType;
                } | null;
            } & {
                id: string;
                assignmentId: string | null;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                bookingId: string | null;
                categoryId: string | null;
                amount: number;
                note: string | null;
                customCategoryName: string | null;
                createdById: string;
            })[];
        } & {
            latitude: number | null;
            longitude: number | null;
            id: string;
            bookingRef: string;
            rawDataId: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            source: string | null;
            confirmationCode: string | null;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            collectAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
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
        tourReport: {
            id: string;
            status: import("@prisma/client").$Enums.TourReportStatus;
            notes: string | null;
            assignmentId: string;
            createdAt: Date;
            updatedAt: Date;
            actualPax: number | null;
            pickupNotes: string | null;
            distanceKm: number | null;
            fuelCost: import("@prisma/client/runtime/library").Decimal | null;
            tollParking: import("@prisma/client/runtime/library").Decimal | null;
            evidenceImages: import("@prisma/client/runtime/library").JsonValue | null;
            verificationNotes: string | null;
            collectedAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundedAmount: import("@prisma/client/runtime/library").Decimal | null;
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
    } & {
        latitude: number | null;
        longitude: number | null;
        id: string;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        totalPax: number;
        tourType: import("@prisma/client").$Enums.TourType | null;
        tourName: string | null;
        createdWho: string | null;
        createdAt: Date;
        updatedAt: Date;
        code: string | null;
        startDate: Date;
        endDate: Date;
        durationDays: number | null;
        pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
        vehicleId: string | null;
        providerId: string | null;
        driverId: string | null;
        guideId: string | null;
        reportVerifierId: string | null;
        origin: import("@prisma/client").$Enums.AssignmentOrigin;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
}
