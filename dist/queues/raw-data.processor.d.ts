import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from "../prisma/prisma.service";
export interface RawDataJob {
    sourceId: string;
    payload: Prisma.InputJsonValue;
    status?: string;
}
export declare class RawDataProcessor extends WorkerHost {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    process(job: Job<RawDataJob>): Promise<{
        saved: boolean;
        id: string;
    }>;
}
