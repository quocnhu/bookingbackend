import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { AutoDispatchCron } from './auto-dispatch.cron';
import { AuditModule } from '@/audit/audit.module';
import { LeavesModule } from '@/leaves/leaves.module';

@Module({
  imports: [AuditModule, LeavesModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AutoDispatchCron],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
