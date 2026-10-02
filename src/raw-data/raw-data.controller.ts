import { Controller, Get, Query } from '@nestjs/common';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PrismaService } from '@/prisma/prisma.service';
import { RawDataService } from './raw-data.service';
import { RAW_DATA_STATUS } from './raw-data.entity';

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
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

    const validStatuses = Object.values(RAW_DATA_STATUS) as string[];
    const where: Record<string, unknown> = {};
    if (status && validStatuses.includes(status)) where.status = status;
    if (templateTag) where.templateTag = templateTag;

    const [total, items] = await Promise.all([
      this.prisma.rawData.count({ where }),
      this.prisma.rawData.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    return { total, page: pageNum, limit: limitNum, items };
  }

  @Permissions('gmail.manage')
  @Get('summary')
  summary() {
    return this.service.summary();
  }
}
