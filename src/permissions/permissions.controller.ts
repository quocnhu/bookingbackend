import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto, QueryPermissionDto, UpdatePermissionDto } from './dto/permission.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions('role.manage')
  findAll(@Query() query: QueryPermissionDto) {
    return this.permissionsService.findAll(query);
  }

  @Get('all')
  @Permissions('role.manage')
  findAllForSelect() {
    return this.permissionsService.findAllFlat();
  }

  @Get(':id')
  @Permissions('role.manage')
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Post()
  @Permissions('role.manage')
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  @Put(':id')
  @Permissions('role.manage')
  update(@Param('id') id: string, @Body() dto: UpdatePermissionDto) {
    return this.permissionsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('role.manage')
  remove(@Param('id') id: string) {
    return this.permissionsService.remove(id);
  }
}
