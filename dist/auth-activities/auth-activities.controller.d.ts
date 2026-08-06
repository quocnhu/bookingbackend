import { AuthActivitiesService } from './auth-activities.service';
import { QueryAuthActivityDto } from './dto/query-auth-activity.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class AuthActivitiesController {
    private readonly authActivitiesService;
    constructor(authActivitiesService: AuthActivitiesService);
    findAll(query: QueryAuthActivityDto, actor: AuthenticatedUser): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
}
