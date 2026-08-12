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

const MAX_GALLERY_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_GALLERY_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class ToursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(STORAGE) private readonly storage: FileStorage,
  ) {}

  async findAll(query: QueryTourDto): Promise<PaginatedResult<any>> {
    const { page, limit, q, type } = query;
    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (type) {
      where.type = type;
    }
    const [items, total] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        include: { _count: { select: { bookings: true } } },
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
        prices: { include: { provider: true } },
        _count: { select: { bookings: true } },
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
    const tour = await this.prisma.tour.create({ data: { ...dto, code } });
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
    const tour = await this.prisma.tour.update({ where: { id }, data: dto });
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
   * Thư mục ảnh của tour là nguồn dữ liệu: liệt kê mọi file trong
   * tours/{tourId}/gallery, không cần bản ghi DB nào.
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
   * Upload ảnh vào "thư mục ảnh" của tour (storage prefix tours/{tourId}/gallery).
   * Tên file mang tiền tố thứ tự (000-, 001-...) để sắp xếp theo folder.
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
    const mime = (file.mimetype || '').toLowerCase();
    if (!ALLOWED_GALLERY_TYPES.includes(mime)) {
      throw new BadRequestException(
        'Gallery only accepts JPG, PNG or WEBP images',
      );
    }
    if (file.size > MAX_GALLERY_IMAGE_BYTES) {
      throw new BadRequestException('Max image size is 15MB');
    }

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
    const baseName = (file.originalname || 'photo')
      .split('/')
      .pop()!
      .replace(/[^\w.\- ]/g, '_')
      .replace(/\.[^.]+$/, '');
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
