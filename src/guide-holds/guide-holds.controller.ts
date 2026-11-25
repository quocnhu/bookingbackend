import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { RoleType } from '@prisma/client';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { GuideHoldsService } from './guide-holds.service';
import {
  CreateGuideHoldDto,
  QueryGuideHoldDto,
  UpdateGuideHoldDto,
} from './dto/guide-hold.dto';

@Controller('guide-holds')
export class GuideHoldsController {
  constructor(private readonly service: GuideHoldsService) {}

  /** The signed-in guide's own upcoming holds (no admin permission needed). */
  @Get('mine')
  mine(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.mine(actor);
  }

  @Get()
  @Roles(RoleType.ADMIN, RoleType.OFFICE)
  list(@Query() query: QueryGuideHoldDto) {
    return this.service.list(query);
  }

  @Post()
  @Roles(RoleType.ADMIN, RoleType.OFFICE)
  create(
    @Body() dto: CreateGuideHoldDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.create(dto, actor);
  }

  @Put(':id')
  @Roles(RoleType.ADMIN, RoleType.OFFICE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGuideHoldDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Post(':id/release')
  @Roles(RoleType.ADMIN, RoleType.OFFICE)
  release(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.release(id, actor);
  }
}
