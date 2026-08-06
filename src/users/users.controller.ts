import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, QueryUserDto, UpdateUserDto, UpdateUserRoleDto } from './dto/user.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { UpdateUserPasswordDto } from './dto/user-password.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('user.read')
  findAll(@Query() query: QueryUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('user.read')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Permissions('user.create')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @Permissions('user.update')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.update(id, dto, { id: actor.id, role: actor.role });
  }

  @Put(':id/roles')
  @Permissions('user.update')
  updateRoles(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.updateRoles(id, dto, { id: actor.id, role: actor.role });
  }

  @Put(':id/password')
  @Permissions('user.update')
  updatePassword(
    @Param('id') id: string,
    @Body() dto: UpdateUserPasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.updatePassword(id, dto, { id: actor.id, role: actor.role });
  }

  @Delete(':id')
  @Permissions('user.delete')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.remove(id, { id: actor.id, role: actor.role });
  }
}
