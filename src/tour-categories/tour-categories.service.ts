import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { slugifyTourName, uniqueTourSlug } from '@/tours/slug.util';
import {
  CreateTourCategoryDto,
  UpdateTourCategoryDto,
} from './dto/tour-category.dto';

@Injectable()
export class TourCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(includeInactive = false) {
    return this.prisma.tourCategory.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { tours: true } } },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.tourCategory.findUnique({
      where: { id },
      include: { _count: { select: { tours: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateTourCategoryDto) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Category name is required');
    const existing = await this.prisma.tourCategory.findUnique({
      where: { name },
    });
    if (existing) throw new ConflictException('Category name already exists');

    const category = await this.prisma.tourCategory.create({
      data: {
        name,
        slug: await this.nextSlug(dto.slug ?? name),
        description: dto.description ?? null,
        sortOrder: dto.sortOrder ?? (await this.nextSortOrder()),
        isActive: dto.isActive ?? true,
      },
    });
    await this.auditService.log({
      entityType: 'TourCategory',
      entityId: category.id,
      action: 'CREATE',
      afterData: category,
    });
    return category;
  }

  async update(id: string, dto: UpdateTourCategoryDto) {
    const before = await this.findOne(id);
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Category name is required');
    }
    if (name && name !== before.name) {
      const dup = await this.prisma.tourCategory.findFirst({
        where: { name, id: { not: id } },
      });
      if (dup) throw new ConflictException('Category name already exists');
    }

    const category = await this.prisma.tourCategory.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(dto.slug !== undefined
          ? { slug: await this.nextSlug(dto.slug, id) }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description ?? null }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    await this.auditService.log({
      entityType: 'TourCategory',
      entityId: id,
      action: 'UPDATE',
      beforeData: before,
      afterData: category,
    });
    return category;
  }

  async remove(id: string) {
    const before = await this.findOne(id);
    await this.prisma.tourCategory.delete({ where: { id } });
    await this.auditService.log({
      entityType: 'TourCategory',
      entityId: id,
      action: 'DELETE',
      beforeData: before,
    });
    return { message: 'Category deleted' };
  }

  private async nextSortOrder(): Promise<number> {
    const aggregate = await this.prisma.tourCategory.aggregate({
      _max: { sortOrder: true },
    });
    return (aggregate._max.sortOrder ?? 0) + 10;
  }

  private async nextSlug(input: string, excludeId?: string): Promise<string> {
    const taken = await this.prisma.tourCategory.findMany({
      where: excludeId ? { id: { not: excludeId } } : undefined,
      select: { slug: true },
    });
    return uniqueTourSlug(
      slugifyTourName(input),
      taken.map((c) => c.slug),
    );
  }
}
