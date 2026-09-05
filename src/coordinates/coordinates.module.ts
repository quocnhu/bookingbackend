import { Module } from '@nestjs/common';
import { CoordinatesController } from './coordinates.controller';
import { CoordinatesService } from './coordinates.service';
import { AuditModule } from '@/audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CoordinatesController],
  providers: [CoordinatesService],
  exports: [CoordinatesService],
})
export class CoordinatesModule {}
