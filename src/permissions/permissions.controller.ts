import { Controller, Get, Param, Query } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { QueryPermissionDto } from './dto/permission.dto';
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
}
