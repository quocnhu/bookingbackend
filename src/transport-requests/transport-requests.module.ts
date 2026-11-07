import { Module } from '@nestjs/common';
import { TransportRequestsController } from './transport-requests.controller';
import { TransportRequestsService } from './transport-requests.service';
import { AuditModule } from '@/audit/audit.module';
import { LeavesModule } from '@/leaves/leaves.module';

@Module({
  imports: [AuditModule, LeavesModule],
  controllers: [TransportRequestsController],
  providers: [TransportRequestsService],
  exports: [TransportRequestsService],
})
export class TransportRequestsModule {}
