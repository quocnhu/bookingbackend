import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto';

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(search?: string, includeInactive = false) {
    const q = search?.trim();
    return this.prisma.partnerAgency.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { contactName: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { assignments: true, partnerPayments: true } } },
    });
  }

  async findOne(id: string) {
    const partner = await this.prisma.partnerAgency.findUnique({
      where: { id },
      include: { _count: { select: { assignments: true, partnerPayments: true } } },
    });
    if (!partner) throw new NotFoundException('Partner agency not found');
    return partner;
  }

  async findActive(id: string) {
    const partner = await this.findOne(id);
    if (!partner.isActive) {
      throw new BadRequestException('Partner agency is inactive');
    }
    return partner;
  }

  async create(dto: CreatePartnerDto) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Partner name is required');
    const existing = await this.prisma.partnerAgency.findUnique({
      where: { name },
    });
    if (existing) throw new ConflictException('Partner name already exists');

    const partner = await this.prisma.partnerAgency.create({
      data: {
        name,
        contactName: dto.contactName?.trim() || null,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        address: dto.address?.trim() || null,
        note: dto.note?.trim() || null,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.log({
      entityType: 'PartnerAgency',
      entityId: partner.id,
      action: 'CREATE',
      afterData: partner,
    });
    return partner;
  }

  async update(id: string, dto: UpdatePartnerDto) {
    const before = await this.findOne(id);
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Partner name is required');
    }
    if (name && name !== before.name) {
      const dup = await this.prisma.partnerAgency.findFirst({
        where: { name, id: { not: id } },
      });
      if (dup) throw new ConflictException('Partner name already exists');
    }

    const partner = await this.prisma.partnerAgency.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(dto.contactName !== undefined
          ? { contactName: dto.contactName?.trim() || null }
          : {}),
        ...(dto.phone !== undefined
          ? { phone: dto.phone?.trim() || null }
          : {}),
        ...(dto.email !== undefined
          ? { email: dto.email?.trim() || null }
          : {}),
        ...(dto.address !== undefined
          ? { address: dto.address?.trim() || null }
          : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    await this.audit.log({
      entityType: 'PartnerAgency',
      entityId: id,
      action: 'UPDATE',
      beforeData: before,
      afterData: partner,
    });
    return partner;
  }

  async remove(id: string) {
    const before = await this.findOne(id);
    if (before._count.assignments > 0 || before._count.partnerPayments > 0) {
      const partner = await this.prisma.partnerAgency.update({
        where: { id },
        data: { isActive: false },
      });
      await this.audit.log({
        entityType: 'PartnerAgency',
        entityId: id,
        action: 'DEACTIVATE',
        beforeData: before,
        afterData: partner,
      });
      return { message: 'Partner deactivated (it is used by trips or payments)' };
    }

    await this.prisma.partnerAgency.delete({ where: { id } });
    await this.audit.log({
      entityType: 'PartnerAgency',
      entityId: id,
      action: 'DELETE',
      beforeData: before,
    });
    return { message: 'Partner deleted' };
  }
}
