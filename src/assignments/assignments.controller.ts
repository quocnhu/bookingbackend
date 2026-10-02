import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AssignmentsService } from './assignments.service';
import { AccountingService } from '@/accounting/accounting.service';
import { CreateSettlementDto } from '@/accounting/dto/accounting.dto';
import {
  AssignBookingsDto,
  CreateAssignmentDto,
  FinalizeAssignmentDto,
  MoveBookingDto,
  QueryAssignmentDto,
  ReorderBookingsDto,
  SetBoardOriginDto,
  SubmitTourReportDto,
  UpdateAssignmentDto,
  UpdateAssignmentStatusDto,
  VerifyTourReportDto,
} from './dto/assignment.dto';
import {
  Permissions,
  AnyPermissions,
} from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('assignments')
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly accountingService: AccountingService,
  ) {}

  @Get()
  @Permissions('assignment.read')
  findAll(
    @Query() query: QueryAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.findAll(query, actor);
  }

  @Get('board')
  @Permissions('assignment.read')
  findBoard(@CurrentUser() actor: AuthenticatedUser) {
    return this.assignmentsService.findBoard(actor);
  }

  @Get('board/mode')
  @Permissions('assignment.read')
  getBoardMode() {
    return this.assignmentsService.getBoardMode();
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
  getCrewAvailability(@Query('from') from?: string, @Query('to') to?: string) {
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
    return this.assignmentsService.findMyCalendar(
      actor,
      year ? +year : undefined,
      month ? +month : undefined,
    );
  }

  @Get(':id')
  @Permissions('assignment.read')
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Post()
  @Permissions('assignment.create')
  create(
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.create(dto, actor);
  }

  @Put(':id')
  @Permissions('assignment.update')
  update(@Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignmentsService.update(id, dto);
  }

  @Put(':id/status')
  @Permissions('assignment.update')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentStatusDto,
  ) {
    return this.assignmentsService.updateStatus(id, dto);
  }

  @Post(':id/bookings/reorder')
  @Permissions('assignment.update')
  reorderBookings(@Param('id') id: string, @Body() dto: ReorderBookingsDto) {
    return this.assignmentsService.reorderBookings(id, dto.bookingIds);
  }

  @Put(':id/bookings/:bookingId/move')
  @Permissions('assignment.update')
  moveBooking(
    @Param('id') id: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: MoveBookingDto,
  ) {
    return this.assignmentsService.moveBooking(
      id,
      bookingId,
      dto.toAssignmentId,
    );
  }

  @Post(':id/bookings')
  @Permissions('assignment.update')
  assignBookings(@Param('id') id: string, @Body() dto: AssignBookingsDto) {
    return this.assignmentsService.assignBookings(id, dto);
  }

  @Delete(':id/bookings/:bookingId')
  @Permissions('assignment.update')
  removeBooking(
    @Param('id') id: string,
    @Param('bookingId') bookingId: string,
  ) {
    return this.assignmentsService.removeBooking(id, bookingId);
  }

  @Post(':id/sync-dates')
  @Permissions('assignment.update')
  syncDatesFromBookings(@Param('id') id: string) {
    return this.assignmentsService.syncDatesFromBookings(id);
  }

  @Delete(':id')
  @Permissions('assignment.delete')
  remove(@Param('id') id: string) {
    return this.assignmentsService.remove(id);
  }

  @Post(':id/tour-report')
  @AnyPermissions('assignment.update', 'assignment.tour-report.submit')
  submitTourReport(
    @Param('id') id: string,
    @Body() dto: SubmitTourReportDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.submitTourReport(id, dto, actor);
  }

  @Post(':id/tour-report/images')
  @AnyPermissions('assignment.update', 'assignment.tour-report.submit')
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

  /**
   * The trip's money sheet — visible to the guide/driver before submitting the
   * report so they know whether they owe the company or the company owes them.
   * Not the Accounting Room view.
   */
  @Get(':id/money')
  tourMoney(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.accountingService.tourMoney(actor, id);
  }

  /** Guide/driver adds their own entry to that trip's money sheet. */
  @Post(':id/money')
  addTourMoney(
    @Param('id') id: string,
    @Body() dto: CreateSettlementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accountingService.addTourMoney(actor, id, dto);
  }

  /** Guide/driver deletes an entry they just added (only while the money is not yet locked). */
  @Delete(':id/money/:settlementId')
  deleteTourMoney(
    @Param('id') id: string,
    @Param('settlementId') settlementId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accountingService.deleteTourMoney(actor, id, settlementId);
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
