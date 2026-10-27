import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { AuditModule } from '@/audit/audit.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { DriveModule } from '@/drive/drive.module';

@Module({
  imports: [AuditModule, NotificationsModule, DriveModule],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
