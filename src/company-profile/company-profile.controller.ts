import { Body, Controller, Get, Put } from '@nestjs/common';
import { CompanyProfileService } from './company-profile.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('company-profile')
export class CompanyProfileController {
  constructor(private readonly companyProfileService: CompanyProfileService) {}

  /** Readable by every logged-in user (the accounting department prints the settlement voucher). */
  @Get()
  get() {
    return this.companyProfileService.getProfile();
  }

  @Put()
  @Permissions('company.update')
  update(@Body() dto: UpdateCompanyProfileDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.companyProfileService.updateProfile(dto, actor);
  }
}