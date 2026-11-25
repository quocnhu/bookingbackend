import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { GuideHoldsController } from './guide-holds.controller';
import { GuideHoldsService } from './guide-holds.service';

@Module({
  imports: [AuditModule],
  controllers: [GuideHoldsController],
  providers: [GuideHoldsService],
  exports: [GuideHoldsService],
})
export class GuideHoldsModule {}
