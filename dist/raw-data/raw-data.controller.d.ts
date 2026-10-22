import { PrismaService } from "../prisma/prisma.service";
import { RawDataService } from './raw-data.service';
export declare class RawDataController {
    private readonly prisma;
    private readonly service;
    constructor(prisma: PrismaService, service: RawDataService);
    list(status?: string, templateTag?: string, action?: string, outcome?: string, page?: string, limit?: string): Promise<{
        total: number;
        page: number;
        limit: number;
        items: {
            bookingId: string | null;
            bookingRef: string | null;
            isAmendment: boolean;
            isCancellation: boolean;
            booking: {
                id: string;
                bookingRef: string;
            } | null;
            linkedBooking: {
                id: string;
                bookingRef: string;
            } | null;
            id: string;
            action: string | null;
            createdAt: Date;
            email: string | null;
            updatedAt: Date;
            status: string;
            templateTag: string | null;
            sourceId: string;
            payload: import("@prisma/client/runtime/library").JsonValue;
            payloadHash: string | null;
            outcome: string | null;
            linkedBookingId: string | null;
        }[];
    }>;
    summary(): Promise<{
        actions: Record<string, number>;
        outcomes: Record<string, number>;
    }>;
}
