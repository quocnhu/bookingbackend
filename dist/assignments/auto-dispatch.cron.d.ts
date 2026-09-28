import { AutoCrewService } from "../queues/auto-crew.service";
import { AssignmentsService } from './assignments.service';
export declare class AutoDispatchCron {
    private readonly autoCrewService;
    private readonly assignmentsService;
    private readonly logger;
    constructor(autoCrewService: AutoCrewService, assignmentsService: AssignmentsService);
    autoDispatchAt4am(): Promise<void>;
}
