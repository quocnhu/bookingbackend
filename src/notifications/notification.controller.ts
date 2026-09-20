import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { RegisterPushDto, SendNotificationDto, NotificationTargetsQueryDto } from './dto/notification.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(@CurrentUser() actor: AuthenticatedUser, @Query('unread') unread?: string) {
    return this.notificationService.findAll(actor.id, unread === '1');
  }

  @Get('targets')
  @Permissions('notification.send')
  targets(@Query() query: NotificationTargetsQueryDto) {
    return this.notificationService.getTargets(query?.search);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() actor: AuthenticatedUser) {
    return this.notificationService.unreadCount(actor.id).then((count) => ({ count }));
  }

  @Put(':id/read')
  markRead(@Param('id') id: string) {
    return this.notificationService.markRead(id);
  }

  @Put('read-all')
  markAllRead(@CurrentUser() actor: AuthenticatedUser) {
    return this.notificationService.markAllRead(actor.id);
  }

  @Post('send')
  @Permissions('notification.send')
  send(@Body() dto: SendNotificationDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.notificationService.send(dto, actor);
  }

  @Post('push/register')
  registerPush(@CurrentUser() actor: AuthenticatedUser, @Body() dto: RegisterPushDto) {
    return this.notificationService.registerPush(actor.id, dto.endpoint, dto.userAgent);
  }

  @Post('push/unregister')
  removePush(@CurrentUser() actor: AuthenticatedUser, @Body('endpoint') endpoint: string) {
    return this.notificationService.removePush(actor.id, endpoint);
  }
}
