import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface AuditEntry {
  entityType: string;
  entityId: string;
  action: string;
  beforeData?: any;
  afterData?: any;
  changedBy?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry) {
    try {
      await this.prisma.auditLog.create({
        data: {
          entityType: entry.entityType,
          entityId: entry.entityId,
          action: entry.action,
          beforeData: entry.beforeData ?? undefined,
          afterData: entry.afterData ?? undefined,
          changedBy: entry.changedBy ?? null,
        },
      });
    } catch (e) {
      // Audit failures must not fail the business flow — but they must be
      // visible, otherwise money audit logs are silently lost.
      console.error('[audit] failed to write audit log:', (e as Error)?.message);
    }
  }
}
