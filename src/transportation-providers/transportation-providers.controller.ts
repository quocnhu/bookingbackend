import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { TransportationProvidersService } from './transportation-providers.service';
import {
  AssignDriverToProviderDto,
  CreateTransportationProviderDto,
  CreateTransportationVehicleDto,
  UpdateTransportationVehicleDto,
} from './dto/transportation-provider.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('transportation-providers')
export class TransportationProvidersController {
  constructor(private readonly transportationProvidersService: TransportationProvidersService) {}

  @Get()
  findAll() {
    return this.transportationProvidersService.findAll();
  }

  @Post()
  @Permissions('provider.create')
  createProvider(@Body() dto: CreateTransportationProviderDto) {
    return this.transportationProvidersService.createProvider(dto);
  }

  @Get('drivers')
  findAllDrivers() {
    return this.transportationProvidersService.findAllDrivers();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transportationProvidersService.findOne(id);
  }

  @Post('vehicles')
  @Permissions('vehicle.create')
  createVehicle(@Body() dto: CreateTransportationVehicleDto) {
    return this.transportationProvidersService.createVehicle(dto);
  }

  @Put('vehicles/:id')
  @Permissions('vehicle.update')
  updateVehicle(@Param('id') id: string, @Body() dto: UpdateTransportationVehicleDto) {
    return this.transportationProvidersService.updateVehicle(id, dto);
  }

  @Delete('vehicles/:id')
  @Permissions('vehicle.delete')
  deleteVehicle(@Param('id') id: string) {
    return this.transportationProvidersService.deleteVehicle(id);
  }

  @Post(':providerId/drivers')
  @Permissions('provider-driver.assign')
  assignDriver(@Param('providerId') providerId: string, @Body() dto: AssignDriverToProviderDto) {
    return this.transportationProvidersService.assignDriver(providerId, dto);
  }

  @Delete(':providerId/drivers/:userId')
  @Permissions('provider-driver.unassign')
  unassignDriver(@Param('providerId') providerId: string, @Param('userId') userId: string) {
    return this.transportationProvidersService.unassignDriver(providerId, userId);
  }
}