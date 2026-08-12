import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import {
  AssignBookingsDto,
  CreateAssignmentDto,
  QueryAssignmentDto,
  UpdateAssignmentDto,
  UpdateAssignmentStatusDto,
} from './dto/assignment.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  @Permissions('assignment.read')
  findAll(@Query() query: QueryAssignmentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.assignmentsService.findAll(query, actor);
  }

  @Get('board')
  @Permissions('assignment.read')
  findBoard(@CurrentUser() actor: AuthenticatedUser) {
    return this.assignmentsService.findBoard(actor);
  }

  @Get(':id')
  @Permissions('assignment.read')
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Post()
  @Permissions('assignment.create')
  create(@Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(dto);
  }

  @Put(':id')
  @Permissions('assignment.update')
  update(@Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignmentsService.update(id, dto);
  }

  @Put(':id/status')
  @Permissions('assignment.update')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAssignmentStatusDto) {
    return this.assignmentsService.updateStatus(id, dto);
  }

  @Post(':id/bookings')
  @Permissions('assignment.update')
  assignBookings(@Param('id') id: string, @Body() dto: AssignBookingsDto) {
    return this.assignmentsService.assignBookings(id, dto);
  }

  @Delete(':id/bookings/:bookingId')
  @Permissions('assignment.update')
  removeBooking(@Param('id') id: string, @Param('bookingId') bookingId: string) {
    return this.assignmentsService.removeBooking(id, bookingId);
  }

  @Delete(':id')
  @Permissions('assignment.delete')
  remove(@Param('id') id: string) {
    return this.assignmentsService.remove(id);
  }
}
