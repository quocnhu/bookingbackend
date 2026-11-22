import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { STORAGE } from '@/storage';
import type { FileStorage } from '@/storage';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

@Injectable()
export class CompanyProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(STORAGE) private readonly storage: FileStorage,
  ) {}

  /** Get the company profile — singleton table, returns null if not configured yet. */
  async getProfile() {
    return this.prisma.companyProfile.findFirst();
  }

  /** Upsert the singleton: the first row if one exists, otherwise create a new one. */
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

  async updateLogo(file: Express.Multer.File | undefined, actor: AuthenticatedUser) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file uploaded');
    }
    if (file.size > MAX_LOGO_BYTES) {
      throw new BadRequestException('The PNG icon must be 2 MB or smaller');
    }
    if (
      file.mimetype !== 'image/png' ||
      !PNG_SIGNATURE.every((byte, index) => file.buffer[index] === byte)
    ) {
      throw new BadRequestException('Only PNG files are allowed');
    }

    const existing = await this.prisma.companyProfile.findFirst();
    if (!existing) {
      throw new BadRequestException(
        'Save the company profile first, then upload the icon.',
      );
    }

    const key = `company/logo-${Date.now()}.png`;
    const saved = await this.storage.save(key, file.buffer, {
      contentType: 'image/png',
    });
    const profile = await this.prisma.companyProfile.update({
      where: { id: existing.id },
      data: { logoUrl: saved.url },
    });

    await this.auditService.log({
      entityType: 'CompanyProfile',
      entityId: profile.id,
      action: 'UPDATE_LOGO',
      beforeData: { logoUrl: existing.logoUrl },
      afterData: {
        logoUrl: profile.logoUrl,
        fileName: file.originalname,
        size: file.size,
      },
      changedBy: actor.id,
    });

    return { logoUrl: profile.logoUrl };
  }
}