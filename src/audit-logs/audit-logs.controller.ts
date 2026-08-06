import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditDto } from './dto/audit-log.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Permissions('audit.read')
  findAll(@Query() query: QueryAuditDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.auditLogsService.findAll(query, actor);
  }
}
