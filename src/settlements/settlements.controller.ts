import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { CreateSettlementDto, QuerySettlementDto, UpdateSettlementDto } from './dto/settlement.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { SettlementStatus } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

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
  create(@Body() dto: CreateSettlementDto) {
    return this.settlementsService.create(dto);
  }

  @Put(':id')
  @Permissions('settlement.update')
  update(@Param('id') id: string, @Body() dto: UpdateSettlementDto) {
    return this.settlementsService.update(id, dto);
  }

  @Put(':id/status')
  @Permissions('settlement.approve')
  updateStatus(@Param('id') id: string, @Body() body: { status: SettlementStatus }) {
    return this.settlementsService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @Permissions('settlement.delete')
  remove(@Param('id') id: string) {
    return this.settlementsService.remove(id);
  }
}
