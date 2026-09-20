import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
export declare class RawDataRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(data: {
        sourceId: string;
        email?: string;
        templateTag?: string;
        payloadHash?: string;
        payload: Prisma.InputJsonValue;
    }): Prisma.Prisma__RawDataClient<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        templateTag: string | null;
        sourceId: string;
        payload: Prisma.JsonValue;
        payloadHash: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    findById(id: string): Prisma.Prisma__RawDataClient<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        templateTag: string | null;
        sourceId: string;
        payload: Prisma.JsonValue;
        payloadHash: string | null;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    findBySourceId(sourceId: string): Prisma.Prisma__RawDataClient<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        templateTag: string | null;
        sourceId: string;
        payload: Prisma.JsonValue;
        payloadHash: string | null;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    updateStatus(id: string, status: string, extra?: Prisma.RawDataUpdateInput): Prisma.Prisma__RawDataClient<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        templateTag: string | null;
        sourceId: string;
        payload: Prisma.JsonValue;
        payloadHash: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    updatePayload(id: string, payload: Prisma.InputJsonValue): Prisma.Prisma__RawDataClient<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        templateTag: string | null;
        sourceId: string;
        payload: Prisma.JsonValue;
        payloadHash: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    markParsed(id: string, bookingId: string): Prisma.Prisma__RawDataClient<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        templateTag: string | null;
        sourceId: string;
        payload: Prisma.JsonValue;
        payloadHash: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    countByStatus(status: string): Prisma.PrismaPromise<number>;
}
