import { Controller, Get, Query } from '@nestjs/common';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PrismaService } from '@/prisma/prisma.service';
import { RawDataService } from './raw-data.service';
import {
  RAW_DATA_ACTION,
  RAW_DATA_OUTCOME,
  RAW_DATA_STATUS,
} from './raw-data.entity';

/**
 * Endpoint for reviewing rawData (per the .md: the "unparsed mail" items that
 * need manual review). Supports filtering by status/templateTag/email and
 * viewing the raw payload (including html) to write/complete the parser.
 */
@Controller('raw-data')
export class RawDataController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly service: RawDataService,
  ) {}

  @Permissions('gmail.manage')
  @Get()
  async list(
    @Query('status') status?: string,
    @Query('templateTag') templateTag?: string,
    @Query('action') action?: string,
    @Query('outcome') outcome?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

    const validStatuses = Object.values(RAW_DATA_STATUS) as string[];
    const where: Record<string, unknown> = {};
    if (status && validStatuses.includes(status)) where.status = status;
    if (templateTag) where.templateTag = templateTag;
    if (action && Object.values(RAW_DATA_ACTION).includes(action as any)) {
      where.action = action;
    }
    if (outcome && Object.values(RAW_DATA_OUTCOME).includes(outcome as any)) {
      where.outcome = outcome;
    }

    const [total, rows] = await Promise.all([
      this.prisma.rawData.count({ where }),
      this.prisma.rawData.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          booking: { select: { id: true, bookingRef: true } },
          linkedBooking: { select: { id: true, bookingRef: true } },
        },
      }),
    ]);

    // The linked booking is the one this email ORIGINATED or the one it
    // AMENDED — both are shown the same way in the list.
    const items = rows.map((row) => {
      const linked = row.linkedBooking ?? row.booking;
      return {
        ...row,
        bookingId: linked?.id ?? null,
        bookingRef: linked?.bookingRef ?? null,
        isAmendment: row.action === 'MODIFY',
        isCancellation: row.action === 'CANCEL',
      };
    });

    return { total, page: pageNum, limit: limitNum, items };
  }

  @Permissions('gmail.manage')
  @Get('summary')
  async summary() {
    const [statuses, actions] = await Promise.all([
      this.service.summary(),
      this.service.actionSummary(),
    ]);
    return { ...statuses, ...actions };
  }
}
