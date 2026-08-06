import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AssignBookingsDto, CreateAssignmentDto, QueryAssignmentDto, UpdateAssignmentDto, UpdateAssignmentStatusDto } from './dto/assignment.dto';
import { PaginatedResult } from "../common/dto/pagination.dto";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class AssignmentsService {
    private readonly prisma;
    private readonly auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    private include;
    findAll(query: QueryAssignmentDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>>;
    findOne(id: string): Promise<{
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
        } | null;
        settlement: {
            id: string;
            createdAt: Date;
            userId: string | null;
            providerId: string | null;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SettlementStatus;
            assignmentId: string;
            payeeType: import("@prisma/client").$Enums.PayeeType;
            baseAmount: import("@prisma/client/runtime/library").Decimal;
            allowance: import("@prisma/client/runtime/library").Decimal;
            deduction: import("@prisma/client/runtime/library").Decimal;
            finalAmount: import("@prisma/client/runtime/library").Decimal;
            periodName: string | null;
            notes: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
        bookings: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string | null;
            phone: string | null;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            assignmentId: string | null;
            rawDataId: string | null;
            paxSequence: number;
        }[];
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        driver: {
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
        guideId: string | null;
        driverId: string | null;
        startDate: Date;
        endDate: Date;
        vehicleId: string | null;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    create(dto: CreateAssignmentDto): Promise<{
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
        } | null;
        settlement: {
            id: string;
            createdAt: Date;
            userId: string | null;
            providerId: string | null;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SettlementStatus;
            assignmentId: string;
            payeeType: import("@prisma/client").$Enums.PayeeType;
            baseAmount: import("@prisma/client/runtime/library").Decimal;
            allowance: import("@prisma/client/runtime/library").Decimal;
            deduction: import("@prisma/client/runtime/library").Decimal;
            finalAmount: import("@prisma/client/runtime/library").Decimal;
            periodName: string | null;
            notes: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
        bookings: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string | null;
            phone: string | null;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            assignmentId: string | null;
            rawDataId: string | null;
            paxSequence: number;
        }[];
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        driver: {
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
        guideId: string | null;
        driverId: string | null;
        startDate: Date;
        endDate: Date;
        vehicleId: string | null;
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
        } | null;
        settlement: {
            id: string;
            createdAt: Date;
            userId: string | null;
            providerId: string | null;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SettlementStatus;
            assignmentId: string;
            payeeType: import("@prisma/client").$Enums.PayeeType;
            baseAmount: import("@prisma/client/runtime/library").Decimal;
            allowance: import("@prisma/client/runtime/library").Decimal;
            deduction: import("@prisma/client/runtime/library").Decimal;
            finalAmount: import("@prisma/client/runtime/library").Decimal;
            periodName: string | null;
            notes: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
        bookings: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string | null;
            phone: string | null;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            assignmentId: string | null;
            rawDataId: string | null;
            paxSequence: number;
        }[];
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        driver: {
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
        guideId: string | null;
        driverId: string | null;
        startDate: Date;
        endDate: Date;
        vehicleId: string | null;
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
        } | null;
        settlement: {
            id: string;
            createdAt: Date;
            userId: string | null;
            providerId: string | null;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SettlementStatus;
            assignmentId: string;
            payeeType: import("@prisma/client").$Enums.PayeeType;
            baseAmount: import("@prisma/client/runtime/library").Decimal;
            allowance: import("@prisma/client/runtime/library").Decimal;
            deduction: import("@prisma/client/runtime/library").Decimal;
            finalAmount: import("@prisma/client/runtime/library").Decimal;
            periodName: string | null;
            notes: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
        bookings: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string | null;
            phone: string | null;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            assignmentId: string | null;
            rawDataId: string | null;
            paxSequence: number;
        }[];
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        driver: {
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
        guideId: string | null;
        driverId: string | null;
        startDate: Date;
        endDate: Date;
        vehicleId: string | null;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    private ensureSettlement;
    assignBookings(id: string, dto: AssignBookingsDto): Promise<{
        vehicle: {
            id: string;
            providerId: string;
            plateNumber: string;
            capacity: number | null;
        } | null;
        settlement: {
            id: string;
            createdAt: Date;
            userId: string | null;
            providerId: string | null;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SettlementStatus;
            assignmentId: string;
            payeeType: import("@prisma/client").$Enums.PayeeType;
            baseAmount: import("@prisma/client/runtime/library").Decimal;
            allowance: import("@prisma/client/runtime/library").Decimal;
            deduction: import("@prisma/client/runtime/library").Decimal;
            finalAmount: import("@prisma/client/runtime/library").Decimal;
            periodName: string | null;
            notes: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
        bookings: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string | null;
            phone: string | null;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            assignmentId: string | null;
            rawDataId: string | null;
            paxSequence: number;
        }[];
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        driver: {
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
        guideId: string | null;
        driverId: string | null;
        startDate: Date;
        endDate: Date;
        vehicleId: string | null;
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
        } | null;
        settlement: {
            id: string;
            createdAt: Date;
            userId: string | null;
            providerId: string | null;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SettlementStatus;
            assignmentId: string;
            payeeType: import("@prisma/client").$Enums.PayeeType;
            baseAmount: import("@prisma/client/runtime/library").Decimal;
            allowance: import("@prisma/client/runtime/library").Decimal;
            deduction: import("@prisma/client/runtime/library").Decimal;
            finalAmount: import("@prisma/client/runtime/library").Decimal;
            periodName: string | null;
            notes: string | null;
        } | null;
        provider: {
            id: string;
            name: string;
        } | null;
        bookings: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string | null;
            phone: string | null;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            assignmentId: string | null;
            rawDataId: string | null;
            paxSequence: number;
        }[];
        guide: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        driver: {
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
        guideId: string | null;
        driverId: string | null;
        startDate: Date;
        endDate: Date;
        vehicleId: string | null;
        sequenceIndex: number;
        priceOverride: import("@prisma/client/runtime/library").Decimal | null;
        tripNotes: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
