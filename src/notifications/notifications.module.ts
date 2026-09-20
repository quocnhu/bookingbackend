import { Module, Global } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationsGateway } from './notifications.gateway';
import { AuditModule } from '@/audit/audit.module';

@Global()
@Module({
  imports: [AuditModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationsGateway],
  exports: [NotificationService, NotificationsGateway],
})
export class NotificationsModule {}
