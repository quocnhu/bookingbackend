import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CoordinatesService } from './coordinates.service';
import { CreateCoordinateDto, QueryCoordinateDto, UpdateCoordinateDto } from './dto/coordinate.dto';
import { Public } from '@/common/decorators/public.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('coordinates')
export class CoordinatesController {
  constructor(private readonly coordinatesService: CoordinatesService) {}

  @Get()
  @Public()
  findAll(@Query() query: QueryCoordinateDto) {
    return this.coordinatesService.findAll(query);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.coordinatesService.findOne(id);
  }

  @Post()
  @Permissions('coordinate.create')
  create(@Body() dto: CreateCoordinateDto) {
    return this.coordinatesService.create(dto);
  }

  @Put(':id')
  @Permissions('coordinate.update')
  update(@Param('id') id: string, @Body() dto: UpdateCoordinateDto) {
    return this.coordinatesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('coordinate.delete')
  remove(@Param('id') id: string) {
    return this.coordinatesService.remove(id);
  }
}
