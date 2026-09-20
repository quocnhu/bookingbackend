import { PrismaService } from '@/prisma/prisma.service';
import { RawDataService } from './raw-data.service';
export declare class RawDataController {
    private readonly prisma;
    private readonly service;
    constructor(prisma: PrismaService, service: RawDataService);
    list(status?: string, templateTag?: string, page?: string, limit?: string): Promise<{
        total: number;
        page: number;
        limit: number;
        items: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            templateTag: string | null;
            sourceId: string;
            payload: import("@prisma/client/runtime/library").JsonValue;
            payloadHash: string | null;
        }[];
    }>;
    summary(): Promise<Record<string, number>>;
}
