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
import { PartnersService } from './partners.service';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @Permissions('assignment.read')
  list(
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.partnersService.list(
      search,
      includeInactive === 'true' || includeInactive === '1',
    );
  }

  @Get(':id')
  @Permissions('assignment.read')
  findOne(@Param('id') id: string) {
    return this.partnersService.findOne(id);
  }

  @Post()
  @Permissions('assignment.update')
  create(@Body() dto: CreatePartnerDto) {
    return this.partnersService.create(dto);
  }

  @Put(':id')
  @Permissions('assignment.update')
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.partnersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('assignment.update')
  remove(@Param('id') id: string) {
    return this.partnersService.remove(id);
  }
}
