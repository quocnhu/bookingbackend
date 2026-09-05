import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { RoutePricesService } from './route-prices.service';
import { CreateRoutePriceDto, QueryRoutePriceDto, UpdateRoutePriceDto } from './dto/route-price.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('route-prices')
export class RoutePricesController {
  constructor(private readonly routePricesService: RoutePricesService) {}

  @Get()
  findAll(@Query() query: QueryRoutePriceDto) {
    return this.routePricesService.findAll(query);
  }

  @Get('dropdown')
  getDropdownData() {
    return this.routePricesService.getDropdownData();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routePricesService.findOne(id);
  }

  @Post()
  @Permissions('route-price.create')
  create(@Body() dto: CreateRoutePriceDto) {
    return this.routePricesService.create(dto);
  }

  @Put(':id')
  @Permissions('route-price.update')
  update(@Param('id') id: string, @Body() dto: UpdateRoutePriceDto) {
    return this.routePricesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('route-price.delete')
  remove(@Param('id') id: string) {
    return this.routePricesService.remove(id);
  }
}
