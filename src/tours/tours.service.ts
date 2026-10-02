import {
  BadRequestException,
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { STORAGE } from '@/storage';
import type { FileStorage } from '@/storage';
import {
  CreateTourDto,
  ItineraryItemDto,
  QueryTourDto,
  UpdateItineraryDto,
  UpdateTourDto,
} from './dto/tour.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import sharp from 'sharp';
import { validateFile, sanitizeFileName, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/common/utils/file-validation.util';

@Injectable()
export class ToursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(STORAGE) private readonly storage: FileStorage,
  ) {}

  async findAll(query: QueryTourDto): Promise<PaginatedResult<any>> {
    const { page, limit, type } = query;
    const where: any = {};
    if (type) {
      where.type = type;
    }
    const [items, total] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        include: { typePrices: true },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.tour.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const tour = await this.prisma.tour.findUnique({
      where: { id },
      include: {
        itineraries: { orderBy: [{ dayNumber: 'asc' }, { orderIndex: 'asc' }] },
        typePrices: true,
        prices: { include: { provider: true } },
      },
    });
    if (!tour) throw new NotFoundException('Tour not found');
    return { ...tour, gallery: await this.listGallery(id) };
  }

  async create(dto: CreateTourDto) {
    const existing = await this.prisma.tour.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Tour name already exists');
    let code = dto.code;
    if (code) {
      const dup = await this.prisma.tour.findUnique({ where: { code } });
      if (dup) throw new ConflictException('Tour code already exists');
    } else {
      code = await this.generateTourCode(dto.name, dto.durationDays ?? 1);
    }
    const { typePrices, ...rest } = dto;
    const tour = await this.prisma.tour.create({
      data: {
        ...rest,
        code,
        typePrices:
          typePrices && typePrices.length > 0
            ? {
                create: typePrices.map((tp) => ({
                  type: tp.type,
                  adultPrice: tp.adultPrice ?? 0,
                  childPrice: tp.childPrice ?? 0,
                  infantPrice: tp.infantPrice ?? 0,
                  currency: tp.currency ?? dto.currency ?? 'USD',
                })),
              }
            : undefined,
      },
    });
    await this.auditService.log({
      entityType: 'Tour',
      entityId: tour.id,
      action: 'CREATE',
      afterData: tour,
    });
    return tour;
  }

  private async generateTourCode(
    name: string,
    durationDays: number,
  ): Promise<string> {
    const words = name.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
    const initials =
      (words[0]?.[0] ?? 'X').toUpperCase() +
      (words[1]?.[0] ?? 'X').toUpperCase();
    const base = `TOUR-${initials}${durationDays}`;
    let code = base;
    let i = 2;
    while (await this.prisma.tour.findUnique({ where: { code } })) {
      code = `${base}-${i++}`;
    }
    return code;
  }

  async update(id: string, dto: UpdateTourDto) {
    const before = await this.findOne(id);
    if (dto.code && dto.code !== before.code) {
      const dup = await this.prisma.tour.findFirst({
        where: { code: dto.code, id: { not: id } },
      });
      if (dup) throw new ConflictException('Tour code already exists');
    }
    const { typePrices, ...rest } = dto;
    await this.prisma.$transaction([
      this.prisma.tour.update({ where: { id }, data: rest }),
      ...(typePrices && typePrices.length > 0
        ? typePrices.map((tp) =>
            this.prisma.tourTypePrice.upsert({
              where: { tourId_type: { tourId: id, type: tp.type } },
              update: {
                adultPrice: tp.adultPrice ?? 0,
                childPrice: tp.childPrice ?? 0,
                infantPrice: tp.infantPrice ?? 0,
                currency: tp.currency ?? dto.currency ?? 'USD',
              },
              create: {
                tourId: id,
                type: tp.type,
                adultPrice: tp.adultPrice ?? 0,
                childPrice: tp.childPrice ?? 0,
                infantPrice: tp.infantPrice ?? 0,
                currency: tp.currency ?? dto.currency ?? 'USD',
              },
            }),
          )
        : []),
    ]);
    const tour = await this.findOne(id);
    await this.auditService.log({
      entityType: 'Tour',
      entityId: id,
      action: 'UPDATE',
      beforeData: before,
      afterData: tour,
    });
    return tour;
  }

  async updateItinerary(
    id: string,
    dto: UpdateItineraryDto,
    changedBy: string,
  ) {
    const before = await this.findOne(id);
    const items: ItineraryItemDto[] = dto.items ?? [];

    await this.prisma.$transaction([
      this.prisma.tourItinerary.deleteMany({ where: { tourId: id } }),
      this.prisma.tourItinerary.createMany({
        data: items.map((item) => ({
          tourId: id,
          dayNumber: item.dayNumber,
          orderIndex: item.orderIndex,
          title: item.title,
          description: item.description ?? null,
          timeSlot: item.timeSlot ?? null,
          location: item.location ?? null,
          imageUrl: item.imageUrl ?? null,
          mapQuery: item.mapQuery ?? null,
        })),
      }),
    ]);

    const after = await this.findOne(id);
    await this.auditService.log({
      entityType: 'Tour',
      entityId: id,
      action: 'UPDATE_ITINERARY',
      beforeData: { itineraries: before.itineraries },
      afterData: { itineraries: after.itineraries },
      changedBy,
    });
    return after;
  }

  private galleryPrefix(tourId: string) {
    return `tours/${tourId}/gallery`;
  }

  /**
   * The tour's image folder is the data source: list every file in
   * tours/{tourId}/gallery, with no DB record needed.
   */
  private async listGallery(tourId: string) {
    const files = await this.storage.list(this.galleryPrefix(tourId));
    files.sort((a, b) => a.key.localeCompare(b.key));
    return files.map((f, index) => ({
      id: f.key.split('/').pop()!, // filename = id
      url: f.url,
      storageKey: f.key,
      sortIndex: index,
    }));
  }

  /**
   * Upload an image into the tour's "image folder" (storage prefix
   * tours/{tourId}/gallery). File names carry an order prefix (000-, 001-...)
   * so they sort by folder.
   */
  async uploadGallery(
    tourId: string,
    file: Express.Multer.File,
    changedBy: string,
  ) {
    await this.findOne(tourId);
    if (!file?.buffer) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file using magic bytes (not just MIME type)
    await validateFile(file.buffer, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE);

    let buffer: Buffer;
    try {
      buffer = await sharp(file.buffer, { failOn: 'none' })
        .rotate()
        .resize(1920, 1440, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        'Could not process the image. Please upload a valid picture.',
      );
    }

    const folder = this.galleryPrefix(tourId);
    const existing = await this.storage.list(folder);
    const padded = String(existing.length).padStart(3, '0');
    const baseName = sanitizeFileName(file.originalname || 'photo').replace(/\.[^.]+$/, '');
    const storageKey = `${folder}/${padded}-${Date.now()}-${baseName}.webp`;
    await this.storage.save(storageKey, buffer, { contentType: 'image/webp' });

    await this.auditService.log({
      entityType: 'Tour',
      entityId: tourId,
      action: 'GALLERY_UPLOAD',
      afterData: { url: this.storage.url(storageKey) },
      changedBy,
    });
    return this.findOne(tourId);
  }

  async deleteGallery(tourId: string, file: string, changedBy: string) {
    const base = file.split('/').pop()!;
    if (base !== file) throw new BadRequestException('Invalid file name');
    await this.storage.remove(`${this.galleryPrefix(tourId)}/${base}`);
    await this.auditService.log({
      entityType: 'Tour',
      entityId: tourId,
      action: 'GALLERY_DELETE',
      afterData: { file: base },
      changedBy,
    });
    return this.findOne(tourId);
  }

  async reorderGallery(tourId: string, files: string[]) {
    await this.findOne(tourId);
    const folder = this.galleryPrefix(tourId);
    const entries = await this.storage.list(folder);
    const byName = new Map(
      entries.map((e) => [e.key.split('/').pop()!, e.key]),
    );
    for (const f of files) {
      if (!byName.has(f)) throw new BadRequestException(`Unknown file: ${f}`);
    }
    for (let i = 0; i < files.length; i++) {
      const fromKey = byName.get(files[i])!;
      const random = files[i].replace(/^\d+-/, '');
      const toKey = `${folder}/${String(i).padStart(3, '0')}-${random}`;
      if (fromKey !== toKey) await this.storage.rename(fromKey, toKey);
    }
    return this.findOne(tourId);
  }

  async remove(id: string, changedBy: string) {
    await this.findOne(id);
    const files = await this.storage.list(this.galleryPrefix(id));
    await Promise.all(files.map((f) => this.storage.remove(f.key)));
    await this.prisma.tour.delete({ where: { id } });
    await this.auditService.log({
      entityType: 'Tour',
      entityId: id,
      action: 'DELETE',
      changedBy,
    });
    return { message: 'Tour deleted' };
  }
}
