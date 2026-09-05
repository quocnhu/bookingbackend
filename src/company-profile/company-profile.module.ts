import { Module } from '@nestjs/common';
import { CompanyProfileController } from './company-profile.controller';
import { CompanyProfileService } from './company-profile.service';
import { AuditModule } from '@/audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CompanyProfileController],
  providers: [CompanyProfileService],
  exports: [CompanyProfileService],
})
export class CompanyProfileModule {}