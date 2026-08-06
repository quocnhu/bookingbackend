import { Module } from '@nestjs/common';
import { ToursController } from './tours.controller';
import { ToursService } from './tours.service';
import { AuditModule } from '@/audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ToursController],
  providers: [ToursService],
  exports: [ToursService],
})
export class ToursModule {}
