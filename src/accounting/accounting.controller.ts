import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AccountingService } from './accounting.service';
import {
  CreateSettlementCategoryDto,
  CreateSettlementDto,
  ExportPeriodDto,
  ListPeopleQueryDto,
  PeriodQueryDto,
  UpdateSettlementDto,
  VerifyTourMoneyDto,
  RejectMoneyDto,
  VoidPeriodDto,
} from './dto/accounting.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ── Revenue/expense categories ──
  @Get('categories')
  listCategories(@CurrentUser() actor: AuthenticatedUser) {
    return this.accountingService.listCategories(actor);
  }

  @Post('categories')
  createCategory(
    @Body() dto: CreateSettlementCategoryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accountingService.createCategory(actor, dto);
  }

  // ── Revenue/expense per trip ──
  @Get('assignments/:assignmentId/settlements')
  listSettlements(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accountingService.listSettlements(actor, assignmentId);
  }

  @Post('assignments/:assignmentId/settlements')
  createSettlement(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: CreateSettlementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accountingService.createSettlement(actor, assignmentId, dto);
  }

  @Put('settlements/:id')
  updateSettlement(
    @Param('id') id: string,
    @Body() dto: UpdateSettlementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accountingService.updateSettlement(actor, id, dto);
  }

  @Post('settlements/:id/reverse')
  reverseSettlement(
    @Param('id') id: string,
    @Body() dto: { note: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accountingService.reverseSettlement(actor, id, dto);
  }

  // ── Sub-tab 2: verification queue ──
  @Get('verification-queue')
  verificationQueue(@CurrentUser() actor: AuthenticatedUser) {
    return this.accountingService.verificationQueue(actor);
  }

  @Post('assignments/:assignmentId/verify-money')
  verifyTourMoney(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: VerifyTourMoneyDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accountingService.verifyTourMoney(actor, assignmentId, dto);
  }

  @Post('assignments/:assignmentId/reject-money')
  rejectTourMoney(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: RejectMoneyDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accountingService.rejectMoney(assignmentId, dto, actor);
  }

  // ── Sub-tab 1: payment period ──
  @Get('people')
  people(
    @Query() query: ListPeopleQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accountingService.people(actor, query);
  }

  @Get('period/preview')
  periodPreview(
    @Query() query: PeriodQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accountingService.periodPreview(actor, query);
  }

  @Post('period/export')
  exportPeriod(
    @Body() dto: ExportPeriodDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accountingService.exportPeriod(actor, dto);
  }

  @Get('period/watermarks')
  watermarkOverview(@CurrentUser() actor: AuthenticatedUser) {
    return this.accountingService.watermarkOverview(actor);
  }

  // ── Sub-tab 3: history ──
  @Post('period/:id/void')
  @HttpCode(HttpStatus.OK)
  voidPeriod(
    @Param('id') id: string,
    @Body() dto: VoidPeriodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accountingService.voidPeriod(user, id, dto);
  }

  @Get('period/history')
  periodHistory(
    @Query('personId') personId: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accountingService.periodHistory(actor, personId);
  }
}
