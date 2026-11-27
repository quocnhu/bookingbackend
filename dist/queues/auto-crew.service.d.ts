import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { GuideConfirmationService } from "../guide-confirmation/guide-confirmation.service";
export declare class AutoCrewService {
    private readonly prisma;
    private readonly audit;
    private readonly guideConfirmation;
    private readonly logger;
    constructor(prisma: PrismaService, audit: AuditService, guideConfirmation: GuideConfirmationService);
    assignCrewForBus(assignmentId: string): Promise<{
        assigned: boolean;
        updates?: undefined;
    } | {
        assigned: string | undefined;
        updates: {
            guideId?: string;
            driverId?: string;
            providerId?: string;
        };
    }>;
    assignMissingCrew(horizonDays?: number): Promise<{
        scanned: number;
        guideAssigned: number;
        driverAssigned: number;
    }>;
    private pickUser;
}
