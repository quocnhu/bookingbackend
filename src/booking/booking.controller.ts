import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import {
  BatchUpdateBookingsDto,
  CreateBookingDto,
  QueryBookingDto,
  UpdateBookingDto,
} from './dto/booking.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @Permissions('booking.read')
  findAll(
    @Query() query: QueryBookingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.bookingService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('booking.read')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  @Post()
  @Permissions('booking.create')
  create(@Body() dto: CreateBookingDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.bookingService.create(dto, actor);
  }

  @Put('batch')
  @Permissions('booking.update')
  updateBatch(@Body() dto: BatchUpdateBookingsDto) {
    return this.bookingService.updateBatch(dto.items);
  }

  @Put(':id')
  @Permissions('booking.update')
  update(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('booking.delete')
  remove(@Param('id') id: string) {
    return this.bookingService.remove(id);
  }
}
