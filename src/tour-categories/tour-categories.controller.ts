import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { TourCategoriesService } from './tour-categories.service';
import {
  CreateTourCategoryDto,
  UpdateTourCategoryDto,
} from './dto/tour-category.dto';
import { Public } from '@/common/decorators/public.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('tour-categories')
export class TourCategoriesController {
  constructor(private readonly tourCategoriesService: TourCategoriesService) {}

  @Get()
  @Public()
  findAll() {
    return this.tourCategoriesService.findAll();
  }

  @Get('admin')
  @Permissions('tour.update')
  findAllAdmin() {
    return this.tourCategoriesService.findAll(true);
  }

  @Post()
  @Permissions('tour.create')
  create(@Body() dto: CreateTourCategoryDto) {
    return this.tourCategoriesService.create(dto);
  }

  @Put(':id')
  @Permissions('tour.update')
  update(@Param('id') id: string, @Body() dto: UpdateTourCategoryDto) {
    return this.tourCategoriesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('tour.delete')
  remove(@Param('id') id: string) {
    return this.tourCategoriesService.remove(id);
  }
}
