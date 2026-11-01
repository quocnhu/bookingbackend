import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { PaymentService } from './payment.service';
import {
  CapturePayPalOrderDto,
  CreatePayPalOrderDto,
  RecordOtaRemittanceDto,
} from './dto/payment.dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Public()
  @Get('paypal/config')
  paypalConfig() {
    return this.payments.publicConfig();
  }

  @Post('paypal/orders')
  createOrder(
    @Body() dto: CreatePayPalOrderDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.payments.createPayPalOrder(dto.bookingId, actor);
  }

  @Post('paypal/capture')
  captureOrder(
    @Body() dto: CapturePayPalOrderDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.payments.capturePayPalOrder(
      dto.bookingId,
      dto.orderId,
      actor,
      dto.note,
    );
  }

  @Post('ota/remittance')
  recordOtaRemittance(
    @Body() dto: RecordOtaRemittanceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.payments.recordOtaRemittance(dto.bookingId, dto, actor);
  }

  @Public()
  @Post('paypal/webhook')
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const raw = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});
    return this.payments.verifyWebhook(headers, raw, req.body);
  }
}
