import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Injectable()
export class CompanyProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Lấy hồ sơ công ty — bảng singleton, trả null nếu chưa được cấu hình. */
  async getProfile() {
    return this.prisma.companyProfile.findFirst();
  }

  /** Upsert singleton: dòng đầu tiên nếu có, ngược lại tạo mới. */
  async updateProfile(dto: UpdateCompanyProfileDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.companyProfile.findFirst();

    const profile = existing
      ? await this.prisma.companyProfile.update({
          where: { id: existing.id },
          data: dto,
        })
      : await this.prisma.companyProfile.create({
          data: dto,
        });

    await this.auditService.log({
      entityType: 'CompanyProfile',
      entityId: profile.id,
      action: 'UPDATE',
      beforeData: existing ?? undefined,
      afterData: profile,
      changedBy: actor.id,
    });

    return profile;
  }
}