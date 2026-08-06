import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { CreateSettlementDto, QuerySettlementDto, UpdateSettlementDto } from './dto/settlement.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { SettlementStatus, RoleType } from '@prisma/client';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Injectable()
export class SettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private include = {
    assignment: true,
    provider: true,
    user: { select: { id: true, name: true, email: true } },
    expenseItems: true,
  };

  async findAll(query: QuerySettlementDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>> {
    const { page, limit, status, payeeType } = query;
    const where: any = {};
    if (status) where.status = status;
    if (payeeType) where.payeeType = payeeType;
    if (actor.role !== RoleType.ADMIN) {
      where.OR = [{ userId: actor.id }, { providerId: actor.providerId }];
    }

    const [items, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where,
        include: this.include,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.settlement.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      include: this.include,
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    return settlement;
  }

  async create(dto: CreateSettlementDto) {
    const existing = await this.prisma.settlement.findUnique({
      where: { assignmentId: dto.assignmentId },
    });
    if (existing) throw new BadRequestException('Settlement already exists for this assignment');

    const finalAmount = dto.baseAmount + (dto.allowance ?? 0) - (dto.deduction ?? 0);
    const settlement = await this.prisma.settlement.create({
      data: {
        assignmentId: dto.assignmentId,
        payeeType: dto.payeeType,
        providerId: dto.providerId,
        userId: dto.userId,
        baseAmount: dto.baseAmount,
        allowance: dto.allowance ?? 0,
        deduction: dto.deduction ?? 0,
        finalAmount,
        periodName: dto.periodName,
        notes: dto.notes,
        expenseItems: dto.expenseItems?.length
          ? { create: dto.expenseItems }
          : undefined,
      },
    });
    await this.auditService.log({
      entityType: 'Settlement',
      entityId: settlement.id,
      action: 'CREATE',
      afterData: settlement,
    });
    return this.findOne(settlement.id);
  }

  async update(id: string, dto: UpdateSettlementDto) {
    const before = await this.findOne(id);
    const data: any = {
      allowance: dto.allowance,
      deduction: dto.deduction,
      periodName: dto.periodName,
      notes: dto.notes,
    };
    // Re-tính finalAmount khi có thay đổi số liệu.
    if (dto.allowance !== undefined || dto.deduction !== undefined) {
      const allowance = dto.allowance ?? Number(before.allowance);
      const deduction = dto.deduction ?? Number(before.deduction);
      data.finalAmount = Number(before.baseAmount) + allowance - deduction;
    }
    const settlement = await this.prisma.settlement.update({ where: { id }, data });
    await this.auditService.log({
      entityType: 'Settlement',
      entityId: id,
      action: 'UPDATE',
      beforeData: before,
      afterData: settlement,
    });
    return this.findOne(id);
  }

  async updateStatus(id: string, status: SettlementStatus) {
    const before = await this.findOne(id);
    const settlement = await this.prisma.settlement.update({ where: { id }, data: { status } });
    await this.auditService.log({
      entityType: 'Settlement',
      entityId: id,
      action: `UPDATE_STATUS:${status}`,
      beforeData: { status: before.status },
      afterData: { status },
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.settlement.delete({ where: { id } });
    await this.auditService.log({ entityType: 'Settlement', entityId: id, action: 'DELETE' });
    return { message: 'Settlement deleted' };
  }
}
