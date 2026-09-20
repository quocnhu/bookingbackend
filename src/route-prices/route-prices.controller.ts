import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { RoutePricesService } from './route-prices.service';
import { CreateRoutePriceDto, QueryRoutePriceDto, UpdateRoutePriceDto } from './dto/route-price.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('route-prices')
export class RoutePricesController {
  constructor(private readonly routePricesService: RoutePricesService) {}

  @Get()
  findAll(@Query() query: QueryRoutePriceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.routePricesService.findAll(query, actor);
  }

  @Get('dropdown')
  getDropdownData(@CurrentUser() actor: AuthenticatedUser) {
    return this.routePricesService.getDropdownData(actor);
  }

  @Get('assignable')
  getAssignable(@CurrentUser() actor: AuthenticatedUser) {
    return this.routePricesService.getAssignable(actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routePricesService.findOne(id);
  }

  @Post()
  @Permissions('route-price.create')
  create(@Body() dto: CreateRoutePriceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.routePricesService.create(actor, dto);
  }

  @Put(':id')
  @Permissions('route-price.update')
  update(@Param('id') id: string, @Body() dto: UpdateRoutePriceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.routePricesService.update(actor, id, dto);
  }

  @Delete(':id')
  @Permissions('route-price.delete')
  remove(@Param('id') id: string) {
    return this.routePricesService.remove(id);
  }
}