import { PrismaService } from '@/prisma/prisma.service';
export interface AuditEntry {
    entityType: string;
    entityId: string;
    action: string;
    beforeData?: any;
    afterData?: any;
    changedBy?: string | null;
}
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(entry: AuditEntry): Promise<void>;
}
