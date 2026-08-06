import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ToursService } from './tours.service';
import { CreateTourDto, QueryTourDto, UpdateItineraryDto, UpdateTourDto } from './dto/tour.dto';
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

  @Delete(':id')
  @Permissions('tour.delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.toursService.remove(id, user.id);
  }
}
