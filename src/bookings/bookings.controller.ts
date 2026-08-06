import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, QueryBookingDto, UpdateBookingDto } from './dto/booking.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @Permissions('booking.read')
  findAll(@Query() query: QueryBookingDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.bookingsService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('booking.read')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Post()
  @Permissions('booking.create')
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @Put(':id')
  @Permissions('booking.update')
  update(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('booking.delete')
  remove(@Param('id') id: string) {
    return this.bookingsService.remove(id);
  }
}
