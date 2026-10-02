import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { TransportationProvidersService } from './transportation-providers.service';
import {
  AssignDriverToProviderDto,
  CreateDriverDto,
  CreateTransportationVehicleDto,
  UpdateDriverDto,
  UpdateTransportationVehicleDto,
} from './dto/transportation-provider.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('transportation-providers')
export class TransportationProvidersController {
  constructor(private readonly transportationProvidersService: TransportationProvidersService) {}

  @Get()
  findAll(@CurrentUser() actor: AuthenticatedUser) {
    return this.transportationProvidersService.findAll(actor);
  }

  @Get('drivers')
  findAllDrivers(@CurrentUser() actor: AuthenticatedUser) {
    return this.transportationProvidersService.findAllDrivers(actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.transportationProvidersService.findOne(id, actor);
  }

  @Post('drivers')
  @Permissions('driver.create')
  createDriver(@Body() dto: CreateDriverDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.transportationProvidersService.createDriver(actor, dto);
  }

  @Put('drivers/:id')
  @Permissions('driver.update')
  updateDriver(@Param('id') id: string, @Body() dto: UpdateDriverDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.transportationProvidersService.updateDriver(actor, id, dto);
  }

  @Post('vehicles')
  @Permissions('vehicle.create')
  createVehicle(@Body() dto: CreateTransportationVehicleDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.transportationProvidersService.createVehicle(actor, dto);
  }

  @Put('vehicles/:id')
  @Permissions('vehicle.update')
  updateVehicle(@Param('id') id: string, @Body() dto: UpdateTransportationVehicleDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.transportationProvidersService.updateVehicle(actor, id, dto);
  }

  @Delete('vehicles/:id')
  @Permissions('vehicle.delete')
  deleteVehicle(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.transportationProvidersService.deleteVehicle(actor, id);
  }

  @Post(':providerId/drivers')
  @Permissions('provider-driver.assign')
  assignDriver(
    @Param('providerId') providerId: string,
    @Body() dto: AssignDriverToProviderDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.transportationProvidersService.assignDriver(actor, providerId, dto);
  }

  @Delete(':providerId/drivers/:userId')
  @Permissions('provider-driver.unassign')
  unassignDriver(
    @Param('providerId') providerId: string,
    @Param('userId') userId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.transportationProvidersService.unassignDriver(actor, providerId, userId);
  }
}