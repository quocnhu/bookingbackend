import { Module, Global } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationsGateway } from './notifications.gateway';

@Global()
@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationsGateway],
  exports: [NotificationService, NotificationsGateway],
})
export class NotificationsModule {}
