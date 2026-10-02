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
import { TourType } from '@prisma/client';
import {
  Permissions,
  AnyPermissions,
} from '@/common/decorators/permissions.decorator';
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

  /**
   * Preview the next booking ref so the "Add Booking" form can pre-fill the
   * Booking Ref field. Must be declared BEFORE `:id` — otherwise the param
   * would swallow this string.
   */
  @Get('next-ref')
  @Permissions('booking.create')
  nextRef(@Query('tourType') tourType?: string) {
    const type =
      tourType === 'PRIVATE_TOUR'
        ? TourType.PRIVATE_TOUR
        : tourType === 'GROUP_TOUR'
          ? TourType.GROUP_TOUR
          : undefined;
    return this.bookingService.previewBookingRef(type);
  }

  @Get(':id')
  @Permissions('booking.read')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  @Post()
  @Permissions('booking.create')
  create(
    @Body() dto: CreateBookingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.bookingService.create(dto, actor);
  }

  @Put('batch')
  @AnyPermissions('booking.update', 'booking.note.update')
  updateBatch(
    @Body() dto: BatchUpdateBookingsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.bookingService.updateBatch(dto.items, actor);
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
