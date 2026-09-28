import { AuditLogsService } from './audit-logs.service';
import { QueryAuditDto } from './dto/audit-log.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class AuditLogsController {
    private readonly auditLogsService;
    constructor(auditLogsService: AuditLogsService);
    findAll(query: QueryAuditDto, actor: AuthenticatedUser): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
}
