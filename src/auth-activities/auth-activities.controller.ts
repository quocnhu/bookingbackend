import { Controller, Get, Query } from '@nestjs/common';
import { AuthActivitiesService } from './auth-activities.service';
import { QueryAuthActivityDto } from './dto/query-auth-activity.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('auth-activities')
export class AuthActivitiesController {
  constructor(private readonly authActivitiesService: AuthActivitiesService) {}

  @Get()
  @Permissions('auth.read')
  findAll(@Query() query: QueryAuthActivityDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.authActivitiesService.findAll(query, actor);
  }
}
