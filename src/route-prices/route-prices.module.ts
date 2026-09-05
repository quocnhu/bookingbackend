import { Module } from '@nestjs/common';
import { RoutePricesController } from './route-prices.controller';
import { RoutePricesService } from './route-prices.service';
import { AuditModule } from '@/audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [RoutePricesController],
  providers: [RoutePricesService],
  exports: [RoutePricesService],
})
export class RoutePricesModule {}
