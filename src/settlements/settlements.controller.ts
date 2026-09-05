import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { CreateSettlementCategoryDto, CreateSettlementDto, QuerySettlementDto, UpdateSettlementDto } from './dto/settlement.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { Public } from '@/common/decorators/public.decorator';

@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get('categories')
  @Permissions('settlement.read')
  listCategories() {
    return this.settlementsService.listCategories();
  }

  @Get('export/provider/:providerId')
  @Permissions('settlement.read')
  exportByProvider(
    @Param('providerId') providerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.settlementsService.exportByProvider(providerId, startDate, endDate);
  }

  @Post('categories')
  @Permissions('settlement.create')
  createCategory(@Body() dto: CreateSettlementCategoryDto) {
    return this.settlementsService.createCategory(dto);
  }

  @Delete('categories/:id')
  @Permissions('settlement.delete')
  removeCategory(@Param('id') id: string) {
    return this.settlementsService.removeCategory(id);
  }

  @Get()
  @Permissions('settlement.read')
  findAll(@Query() query: QuerySettlementDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.settlementsService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('settlement.read')
  findOne(@Param('id') id: string) {
    return this.settlementsService.findOne(id);
  }

  @Post()
  @Permissions('settlement.create')
  create(@Body() dto: CreateSettlementDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.settlementsService.create(dto, actor);
  }

  @Put(':id')
  @Permissions('settlement.update')
  update(@Param('id') id: string, @Body() dto: UpdateSettlementDto) {
    return this.settlementsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('settlement.delete')
  remove(@Param('id') id: string) {
    return this.settlementsService.remove(id);
  }
}
