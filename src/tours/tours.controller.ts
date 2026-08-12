import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ToursService } from './tours.service';
import {
  CreateTourDto,
  QueryTourDto,
  ReorderGalleryDto,
  UpdateItineraryDto,
  UpdateTourDto,
} from './dto/tour.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('tours')
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @Get()
  @Public()
  findAll(@Query() query: QueryTourDto) {
    return this.toursService.findAll(query);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.toursService.findOne(id);
  }

  @Post()
  @Permissions('tour.create')
  create(@Body() dto: CreateTourDto) {
    return this.toursService.create(dto);
  }

  @Put(':id')
  @Permissions('tour.update')
  update(@Param('id') id: string, @Body() dto: UpdateTourDto) {
    return this.toursService.update(id, dto);
  }

  @Put(':id/itinerary')
  @Permissions('tour.itinerary.edit')
  updateItinerary(
    @Param('id') id: string,
    @Body() dto: UpdateItineraryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.toursService.updateItinerary(id, dto, user.id);
  }

  @Post(':id/media')
  @Permissions('tour.itinerary.edit')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadMedia(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.toursService.uploadGallery(id, file, user.id);
  }

  @Put(':id/gallery/reorder')
  @Permissions('tour.itinerary.edit')
  reorderGallery(@Param('id') id: string, @Body() dto: ReorderGalleryDto) {
    return this.toursService.reorderGallery(id, dto.files);
  }

  @Delete(':id/gallery/:file')
  @Permissions('tour.itinerary.edit')
  deleteMedia(
    @Param('id') id: string,
    @Param('file') file: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.toursService.deleteGallery(id, file, user.id);
  }

  @Delete(':id')
  @Permissions('tour.delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.toursService.remove(id, user.id);
  }
}
