import {
  BadRequestException,
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
import { AutoDispatchCron } from './auto-dispatch.cron';
import { PickupReminderCron } from './pickup-reminder.cron';
import { AccountingService } from '@/accounting/accounting.service';
import { GuideConfirmationService } from '@/guide-confirmation/guide-confirmation.service';
import { CreateSettlementDto } from '@/accounting/dto/accounting.dto';
import {
  AssignBookingsDto,
  ConfirmPartnerHandoffDto,
  CreateAssignmentDto,
  FinalizeAssignmentDto,
  MoveBookingDto,
  QueryAssignmentDto,
  ReorderBookingsDto,
  ReturnPartnerHandoffDto,
  SetBoardOriginDto,
  SubmitTourReportDto,
  UpdateAssignmentDto,
  UpdateAssignmentStatusDto,
  UpdateAutoDispatchDto,
  UpdateDispatchWindowDto,
  UpdatePickupReminderModeDto,
  UpdatePickupReminderSettingsDto,
  UpdateRecallCutoffDto,
  VerifyTourReportDto,
} from './dto/assignment.dto';
import {
  Permissions,
  AnyPermissions,
} from '@/common/decorators/permissions.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RoleType } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('assignments')
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly autoDispatchCron: AutoDispatchCron,
    private readonly pickupReminderCron: PickupReminderCron,
    private readonly accountingService: AccountingService,
    private readonly guideConfirmation: GuideConfirmationService,
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
  dispatchAllBoard(
    @Body('date') date?: string,
    @Body('override') override?: boolean,
    @CurrentUser() actor?: AuthenticatedUser,
  ) {
    if (!date) {
      return this.assignmentsService.dispatchAllBoard(undefined, {
        override,
        actor,
      });
    }
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid dispatch date');
    }
    return this.assignmentsService.dispatchAllBoard(parsed, {
      override,
      actor,
    });
  }

  @Get('board/seal')
  @Permissions('assignment.read')
  getBoardSeal(@Query('date') date?: string) {
    if (!date) {
      throw new BadRequestException('date=YYYY-MM-DD is required');
    }
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return this.assignmentsService.getSealInfo(date);
  }

  @Get('board/auto-dispatch')
  @Permissions('assignment.read')
  getAutoDispatchSettings() {
    return this.autoDispatchCron.getSettings();
  }

  @Put('board/auto-dispatch')
  @Permissions('assignment.update')
  updateAutoDispatchSettings(
    @Body() dto: UpdateAutoDispatchDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.autoDispatchCron.updateSettings(dto, actor.id);
  }

  @Get('board/dispatch-window')
  @Permissions('assignment.read')
  getDispatchWindow() {
    return this.assignmentsService.getDispatchOpenTime();
  }

  @Put('board/dispatch-window')
  @Permissions('assignment.update')
  updateDispatchWindow(
    @Body() dto: UpdateDispatchWindowDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.updateDispatchOpenTime(dto, actor.id);
  }

  @Get('board/recall-cutoff')
  @Permissions('assignment.read')
  getRecallCutoff() {
    return this.assignmentsService.getRecallCutoff();
  }

  @Get('board/pickup-reminder')
  @Permissions('assignment.read')
  getPickupReminderSettings() {
    return this.pickupReminderCron.getSettings();
  }

  @Put('board/pickup-reminder')
  @Permissions('assignment.update')
  updatePickupReminderSettings(
    @Body() dto: UpdatePickupReminderSettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.pickupReminderCron.updateSettings(dto, actor.id);
  }

  @Put('board/recall-cutoff')
  @Permissions('assignment.update')
  updateRecallCutoff(
    @Body() dto: UpdateRecallCutoffDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.updateRecallCutoff(dto, actor.id);
  }

  @Get('board/crew')
  @Roles(RoleType.ADMIN, RoleType.OFFICE)
  getBoardCrew() {
    return this.assignmentsService.getBoardCrew();
  }

  @Get('board/crew/availability')
  @Roles(RoleType.ADMIN, RoleType.OFFICE)
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

  @Post(':id/guide-confirm')
  confirmGuideAssignment(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.guideConfirmation.confirm(id, actor);
  }

  @Post(':id/guide-decline')
  declineGuideAssignment(
    @Param('id') id: string,
    @Body('reason') reason: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.guideConfirmation.decline(id, actor, reason);
  }

  @Post(':id/guide-confirmation/resend')
  @Permissions('assignment.update')
  resendGuideConfirmation(@Param('id') id: string) {
    return this.guideConfirmation.request(id, { reminder: true });
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

  @Post(':id/partner-confirm')
  @Permissions('assignment.update')
  confirmPartner(
    @Param('id') id: string,
    @Body() dto: ConfirmPartnerHandoffDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.confirmPartnerHandoff(id, dto, actor);
  }

  @Post(':id/partner-return')
  @Permissions('assignment.update')
  returnPartner(
    @Param('id') id: string,
    @Body() dto: ReturnPartnerHandoffDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.returnPartnerHandoff(id, dto, actor);
  }

  @Get(':id')
  @Permissions('assignment.read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.assignmentsService.findOne(id, actor);
  }

  @Put(':id/pickup-reminder-mode')
  @Permissions('assignment.update')
  updatePickupReminderMode(
    @Param('id') id: string,
    @Body() dto: UpdatePickupReminderModeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.updatePickupReminderMode(id, dto, actor);
  }

  @Post(':id/pickup-reminder')
  @Permissions('assignment.update')
  sendPickupReminder(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.sendPickupReminder(id, actor);
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
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.update(id, dto, actor);
  }

  @Put(':id/status')
  @Permissions('assignment.update')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.updateStatus(id, dto, actor);
  }

  @Post(':id/bookings/reorder')
  @Permissions('assignment.update')
  reorderBookings(
    @Param('id') id: string,
    @Body() dto: ReorderBookingsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.reorderBookings(id, dto.bookingIds, actor);
  }

  @Put(':id/bookings/:bookingId/move')
  @Permissions('assignment.update')
  moveBooking(
    @Param('id') id: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: MoveBookingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.moveBooking(
      id,
      bookingId,
      dto.toAssignmentId,
      actor,
    );
  }

  @Post(':id/bookings')
  @Permissions('assignment.update')
  assignBookings(
    @Param('id') id: string,
    @Body() dto: AssignBookingsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.assignBookings(id, dto, actor);
  }

  @Delete(':id/bookings/:bookingId')
  @Permissions('assignment.update')
  removeBooking(
    @Param('id') id: string,
    @Param('bookingId') bookingId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.removeBooking(id, bookingId, actor);
  }

  @Post(':id/sync-dates')
  @Permissions('assignment.update')
  syncDatesFromBookings(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.assignmentsService.syncDatesFromBookings(id, actor);
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
