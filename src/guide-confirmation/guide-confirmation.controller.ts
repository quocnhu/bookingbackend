import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { GuideConfirmationService } from './guide-confirmation.service';
import { QueryGuideConfirmationDto } from './dto/query-guide-confirmation.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('guide-confirmations')
export class GuideConfirmationController {
  constructor(private readonly service: GuideConfirmationService) {}

  @Get()
  @Permissions('assignment.read')
  list(@Query() query: QueryGuideConfirmationDto) {
    return this.service.list(query);
  }

  @Post(':id/confirm')
  @Permissions('assignment.update')
  confirm(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.confirm(id, actor);
  }

  @Post(':id/decline')
  @Permissions('assignment.update')
  decline(
    @Param('id') id: string,
    @Body('reason') reason: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.decline(id, actor, reason);
  }

  @Post(':id/resend')
  @Permissions('assignment.update')
  resend(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.request(id, { actorId: actor.id, reminder: true });
  }
}
