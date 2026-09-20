import { Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AssignmentsService } from './assignments.service';
import {
  AssignBookingsDto,
  CreateAssignmentDto,
  FinalizeAssignmentDto,
  MoveBookingDto,
  QueryAssignmentDto,
  ReorderBookingsDto,
  SetBoardOriginDto,
  SettlementSummaryDto,
  SubmitTourReportDto,
  UpdateAssignmentDto,
  UpdateAssignmentStatusDto,
  VerifyTourReportDto,
} from './dto/assignment.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
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

  @Put('board/origin')
  @Permissions('assignment.update')
  setBoardOrigin(@Body() dto: SetBoardOriginDto) {
    return this.assignmentsService.setBoardOrigin(dto.origin);
  }

  @Post('board/dispatch-all')
  @Permissions('assignment.update')
  dispatchAllBoard() {
    return this.assignmentsService.dispatchAllBoard();
  }

  @Get('board/crew')
  @Permissions('assignment.read')
  getBoardCrew() {
    return this.assignmentsService.getBoardCrew();
  }

  @Get('board/crew/availability')
  @Permissions('assignment.read')
  getCrewAvailability(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.assignmentsService.getCrewAvailability(
      new Date(from ?? Date.now()),
      new Date(to ?? Date.now()),
    );
  }

  @Get('my-assignments')
  findMyAssignments(@CurrentUser() actor: AuthenticatedUser) {
    return this.assignmentsService.findMyAssignments(actor);
  }

  @Get('my-calendar')
  findMyCalendar(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.assignmentsService.findMyCalendar(actor, year ? +year : undefined, month ? +month : undefined);
  }

  @Get('my-payments')
  findMyPayments(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.assignmentsService.findMyPayments(actor, startDate, endDate);
  }

  @Get('settlement-summary')
  @Permissions('assignment.read')
  settlementSummary(@Query() dto: SettlementSummaryDto) {
    return this.assignmentsService.settlementSummary(
      dto.from,
      dto.to,
      dto.guideId,
      dto.driverId,
    );
  }

  @Get(':id')
  @Permissions('assignment.read')
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Post()
  @Permissions('assignment.create')
  create(@Body() dto: CreateAssignmentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.assignmentsService.create(dto, actor);
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

  @Post(':id/bookings/reorder')
  @Permissions('assignment.update')
  reorderBookings(
    @Param('id') id: string,
    @Body() dto: ReorderBookingsDto,
  ) {
    return this.assignmentsService.reorderBookings(id, dto.bookingIds);
  }

  @Put(':id/bookings/:bookingId/move')
  @Permissions('assignment.update')
  moveBooking(
    @Param('id') id: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: MoveBookingDto,
  ) {
    return this.assignmentsService.moveBooking(id, bookingId, dto.toAssignmentId);
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

  @Post(':id/tour-report')
  @Permissions('assignment.update')
  submitTourReport(
    @Param('id') id: string,
    @Body() dto: SubmitTourReportDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.submitTourReport(id, dto, actor);
  }

  @Post(':id/tour-report/images')
  @Permissions('assignment.update')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  uploadTourReportImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.uploadReportImage(id, file, actor);
  }

  @Put(':id/tour-report/verify')
  @Permissions('assignment.update')
  verifyTourReport(
    @Param('id') id: string,
    @Body() dto: VerifyTourReportDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.verifyTourReport(id, dto, actor);
  }

  @Put(':id/finalize')
  @Permissions('assignment.update')
  finalize(
    @Param('id') id: string,
    @Body() dto: FinalizeAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.finalize(id, dto, actor);
  }
}
