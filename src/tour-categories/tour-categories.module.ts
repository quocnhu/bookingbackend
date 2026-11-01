import { Module } from '@nestjs/common';
import { TourCategoriesController } from './tour-categories.controller';
import { TourCategoriesService } from './tour-categories.service';
import { AuditModule } from '@/audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [TourCategoriesController],
  providers: [TourCategoriesService],
  exports: [TourCategoriesService],
})
export class TourCategoriesModule {}
