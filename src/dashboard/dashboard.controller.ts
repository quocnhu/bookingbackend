import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import type { RangeKey } from './dashboard.service';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Permissions('dashboard.read')
  stats() {
    return this.dashboardService.stats();
  }

  @Get('charts')
  @Permissions('dashboard.read')
  charts(@Query('range') range: RangeKey = 'week') {
    return this.dashboardService.charts(range);
  }

  @Get('widgets')
  @Permissions('dashboard.read')
  widgets() {
    return this.dashboardService.widgets();
  }
}
