import { Controller, Get, Query } from '@nestjs/common';
import { RoleType } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import type { RangeKey } from './dashboard.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  private canViewFinance(user: AuthenticatedUser): boolean {
    return (
      user.role === RoleType.ADMIN ||
      user.permissions?.includes('dashboard.finance.read')
    );
  }

  @Get('stats')
  @Permissions('dashboard.read')
  stats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.dashboardService.stats(
      fromDate,
      toDate,
      this.canViewFinance(user),
    );
  }

  @Get('charts')
  @Permissions('dashboard.read')
  charts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('range') range: RangeKey = 'week',
  ) {
    return this.dashboardService.charts(range, this.canViewFinance(user));
  }

  @Get('widgets')
  @Permissions('dashboard.read')
  widgets() {
    return this.dashboardService.widgets();
  }
}
