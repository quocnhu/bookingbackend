import { AutoCrewService } from "../queues/auto-crew.service";
import { PrismaService } from "../prisma/prisma.service";
import { AssignmentsService } from './assignments.service';
export declare class AutoDispatchCron {
    private readonly autoCrewService;
    private readonly assignmentsService;
    private readonly prisma;
    private readonly logger;
    constructor(autoCrewService: AutoCrewService, assignmentsService: AssignmentsService, prisma: PrismaService);
    autoDispatchAt4am(): Promise<void>;
}
