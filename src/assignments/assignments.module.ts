import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { AuditModule } from '@/audit/audit.module';
import { LeavesModule } from '@/leaves/leaves.module';

@Module({
  imports: [AuditModule, LeavesModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
