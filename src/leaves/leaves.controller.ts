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
import { LeavesService } from './leaves.service';
import {
  CreateLeaveDto,
  QueryLeaveDto,
  UpdateLeaveStatusDto,
} from './dto/leave.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Get()
  findAll(@Query() query: QueryLeaveDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.leavesService.findAll(query, actor);
  }

  @Get('my')
  findMy(@CurrentUser() actor: AuthenticatedUser) {
    return this.leavesService.findMy(actor);
  }

  @Post()
  create(@Body() dto: CreateLeaveDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.leavesService.create(dto, actor);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeaveStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.leavesService.updateStatus(id, dto, actor);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.leavesService.remove(id, actor);
  }
}