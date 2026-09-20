import { PrismaService } from '@/prisma/prisma.service';
import { QueryAuditDto } from './dto/audit-log.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
export declare class AuditLogsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: QueryAuditDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>>;
}
