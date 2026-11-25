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
import { RoleType } from '@prisma/client';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { HotelsService } from './hotels.service';
import {
  CreateHotelDto,
  QueryHotelBookingsDto,
  UpdateHotelDto,
} from './dto/hotel.dto';

@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotels: HotelsService) {}

  @Get('public')
  @Public()
  publicList() {
    return this.hotels.publicList();
  }

  @Get('me/dashboard')
  @Roles(RoleType.HOTEL, RoleType.ADMIN)
  myDashboard(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('hotelId') hotelId?: string,
  ) {
    return this.hotels.dashboard(actor, hotelId);
  }

  @Get('me/bookings')
  @Roles(RoleType.HOTEL, RoleType.ADMIN)
  myBookings(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: QueryHotelBookingsDto,
    @Query('hotelId') hotelId?: string,
  ) {
    return this.hotels.bookings(actor, query, hotelId);
  }

  @Get()
  @Roles(RoleType.ADMIN, RoleType.OFFICE)
  list() {
    return this.hotels.list();
  }

  @Post()
  @Roles(RoleType.ADMIN)
  create(
    @Body() dto: CreateHotelDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.hotels.create(dto, actor);
  }

  @Put(':id')
  @Roles(RoleType.ADMIN, RoleType.OFFICE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHotelDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.hotels.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.hotels.remove(id, actor);
  }
}
