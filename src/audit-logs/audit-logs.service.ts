import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { QueryAuditDto } from './dto/audit-log.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { RoleType } from '@prisma/client';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAuditDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>> {
    const { page, limit, entityType, entityId, action, changedBy, from, to } = query;
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = { contains: action };
    if (changedBy) where.changedBy = changedBy;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (actor.role !== RoleType.ADMIN) {
      where.changedBy = actor.id;
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, limit };
  }
}
