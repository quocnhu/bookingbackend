import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { AutoDispatchCron } from './auto-dispatch.cron';
import { AuditModule } from '@/audit/audit.module';
import { LeavesModule } from '@/leaves/leaves.module';
import { AccountingModule } from '@/accounting/accounting.module';
import { DriveModule } from '@/drive/drive.module';

@Module({
  imports: [AuditModule, LeavesModule, AccountingModule, DriveModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AutoDispatchCron],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
