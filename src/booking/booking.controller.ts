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
  CollectBookingPaymentDto,
  ConfirmBookingPaymentDto,
  CreateBookingDto,
  CreatePrivateGroupDto,
  CreateWebsiteBookingDto,
  QueryBookingDto,
  UpdateBookingDto,
  WebsiteQuoteDto,
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
  /** Authenticated website quote. Amount is recalculated again on create. */
  @Post('website/quote')
  quoteWebsite(@Body() dto: WebsiteQuoteDto) {
    return this.bookingService.websiteQuote(dto);
  }

  /**
   * Website booking for the signed-in customer. It deliberately has no
   * booking.create permission: customers may book, but only through this
   * ownership-checked path.
   */
  @Post('website')
  createWebsite(
    @Body() dto: CreateWebsiteBookingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.bookingService.createWebsite(dto, actor);
  }

  @Post(':id/payment/collect')
  collectPayment(
    @Param('id') id: string,
    @Body() dto: CollectBookingPaymentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.bookingService.collectBookingPayment(id, dto, actor);
  }

  @Post(':id/payment/confirm')
  confirmPayment(
    @Param('id') id: string,
    @Body() dto: ConfirmBookingPaymentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.bookingService.confirmBookingPayment(id, dto, actor);
  }

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

  @Post(':id/private-group')
  @Permissions('booking.create')
  createPrivateGroup(
    @Param('id') id: string,
    @Body() dto: CreatePrivateGroupDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.bookingService.createPrivateGroup(id, dto, actor);
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
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.bookingService.update(id, dto, actor);
  }

  @Delete(':id')
  @Permissions('booking.delete')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.bookingService.remove(id, actor);
  }
}
