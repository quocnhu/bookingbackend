import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { TransportRequestsService } from './transport-requests.service';
import {
  AssignTransportRequestDto,
  CancelTransportRequestDto,
  DeclineTransportRequestDto,
  OverrideTransportRequestDto,
  QueryTransportRequestDto,
  SendTransportRequestDto,
  UpdateProviderAssignmentModeDto,
  UpdateTransportRequestSettingsDto,
} from './dto/transport-request.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('transport-requests')
export class TransportRequestsController {
  constructor(private readonly service: TransportRequestsService) {}

  @Get()
  @Permissions('assignment.read')
  list(
    @Query() query: QueryTransportRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.list(query, actor);
  }

  @Get('settings')
  @Permissions('assignment.read')
  getSettings() {
    return this.service.getSettings();
  }

  @Put('settings')
  @Permissions('assignment.update')
  updateSettings(
    @Body() dto: UpdateTransportRequestSettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateSettings(dto, actor);
  }

  @Get('provider-settings')
  @Permissions('assignment.read')
  getProviderSettings(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('providerId') providerId?: string,
  ) {
    return this.service.getProviderSettings(actor, providerId);
  }

  @Put('provider-settings')
  @Permissions('assignment.create')
  updateProviderSettings(
    @Body() dto: UpdateProviderAssignmentModeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateProviderSettings(dto, actor);
  }

  @Get('workload')
  @Permissions('assignment.read')
  getDriverWorkload(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('providerId') providerId?: string,
  ) {
    return this.service.getDriverWorkload(actor, providerId);
  }

  @Get('candidates/:assignmentId')
  @Permissions('assignment.read')
  getCandidates(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.getCandidates(assignmentId, actor);
  }

  @Post(':id/send')
  @Permissions('assignment.update')
  send(
    @Param('id') id: string,
    @Body() dto: SendTransportRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.send(id, dto, actor);
  }

  @Post(':id/cancel')
  @Permissions('assignment.update')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelTransportRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.cancel(id, dto, actor);
  }

  @Post(':id/override')
  @Permissions('assignment.update')
  override(
    @Param('id') id: string,
    @Body() dto: OverrideTransportRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.override(id, dto, actor);
  }

  @Post(':id/view')
  @Permissions('assignment.read')
  markViewed(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.markViewed(id, actor);
  }

  @Post(':id/assign')
  @Permissions('assignment.create')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignTransportRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.assign(id, dto, actor);
  }

  @Post(':id/auto-assign')
  @Permissions('assignment.create')
  autoAssign(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.autoAssign(id, actor);
  }

  @Post(':id/decline')
  @Permissions('assignment.create')
  decline(
    @Param('id') id: string,
    @Body() dto: DeclineTransportRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.decline(id, dto, actor);
  }
}
