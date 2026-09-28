import { PrismaService } from "../prisma/prisma.service";
import { LeavesService } from "../leaves/leaves.service";
import { AuditService } from "../audit/audit.service";
export declare class AutoCrewService {
    private readonly prisma;
    private readonly leaves;
    private readonly audit;
    private readonly logger;
    constructor(prisma: PrismaService, leaves: LeavesService, audit: AuditService);
    assignCrewForBus(assignmentId: string): Promise<{
        assigned: boolean;
        updates?: undefined;
    } | {
        assigned: string | undefined;
        updates: {
            guideId?: string;
            driverId?: string;
        };
    }>;
    assignMissingCrew(horizonDays?: number): Promise<{
        scanned: number;
        guideAssigned: number;
        driverAssigned: number;
    }>;
    private normalizeStart;
    private normalizeEnd;
    private pickUserId;
    private busyUserIds;
}
