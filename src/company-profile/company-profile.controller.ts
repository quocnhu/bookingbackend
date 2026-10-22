import { Body, Controller, Get, Put } from '@nestjs/common';
import { CompanyProfileService } from './company-profile.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('company-profile')
export class CompanyProfileController {
  constructor(private readonly companyProfileService: CompanyProfileService) {}

  /**
   * Public read-only view of the company details — the Name / Address / Phone
   * that the public website shows and that the SEO structured data repeats.
   *
   * Only the fields that are already published on the site are exposed (the
   * tax id is NOT) — the point is to have a single source of truth for NAP.
   */
  @Public()
  @Get('public')
  async publicProfile() {
    const profile = await this.companyProfileService.getProfile();
    if (!profile) return null;
    return {
      name: profile.name,
      address: profile.address,
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      latitude: profile.rootLatitude,
      longitude: profile.rootLongitude,
    };
  }

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