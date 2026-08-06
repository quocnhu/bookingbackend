import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto, QueryRoleDto, UpdateRoleDto } from './dto/role.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('role.manage')
  findAll(@Query() query: QueryRoleDto) {
    return this.rolesService.findAll(query);
  }

  @Get('all')
  @Permissions('role.manage')
  findAllForSelect() {
    return this.rolesService.findAll({ page: 1, limit: 100 });
  }

  @Get(':id')
  @Permissions('role.manage')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @Permissions('role.manage')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Put(':id')
  @Permissions('role.manage')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('role.manage')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
