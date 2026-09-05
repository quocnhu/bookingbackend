import { Module } from '@nestjs/common';
import { TransportationProvidersController } from './transportation-providers.controller';
import { TransportationProvidersService } from './transportation-providers.service';
import { AuditModule } from '@/audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [TransportationProvidersController],
  providers: [TransportationProvidersService],
  exports: [TransportationProvidersService],
})
export class TransportationProvidersModule {}