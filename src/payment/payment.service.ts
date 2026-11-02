import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  BookingProvider,
  PaymentMethod,
  PaymentRecordStatus,
  PaymentStatus,
  PayerType,
  Prisma,
  RoleType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { QueryBookingPaymentsDto } from './dto/payment.dto';
import { Interval } from '@nestjs/schedule';

type PayPalCapture = {
  id?: string;
  status?: string;
  amount?: { currency_code?: string; value?: string };
  supplementary_data?: {
    related_ids?: { order_id?: string };
  };
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private tokenCache: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private get mode(): 'sandbox' | 'live' {
    return (process.env.PAYPAL_MODE ?? 'sandbox').toLowerCase() === 'live'
      ? 'live'
      : 'sandbox';
  }

  private get baseUrl(): string {
    return this.mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  private get clientId(): string {
    return process.env.PAYPAL_CLIENT_ID?.trim() ?? '';
  }

  private get clientSecret(): string {
    return process.env.PAYPAL_CLIENT_SECRET?.trim() ?? '';
  }

  private get currency(): string {
    return (process.env.PAYPAL_CURRENCY ?? 'USD').toUpperCase();
  }

  private get vndPerUsd(): number {
    return Number(process.env.PAYPAL_VND_PER_USD ?? 25000);
  }

  isConfigured(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }

  publicConfig() {
    return {
      enabled: this.isConfigured(),
      provider: 'paypal',
      mode: this.mode,
      clientId: this.clientId || null,
      currency: this.currency,
      vndPerUsd: this.vndPerUsd,
    };
  }

  private pendingTtlMinutes(): number {
    const value = Number(process.env.PAYPAL_PENDING_TTL_MINUTES ?? 180);
    return Number.isFinite(value) && value >= 5 ? value : 180;
  }

  @Interval(30 * 60 * 1000)
  async expireStalePayPalPaymentsJob() {
    try {
      await this.expireStalePayPalPayments();
    } catch (e) {
      this.logger.warn(
        `PayPal pending cleanup failed: ${(e as Error).message}`,
      );
    }
  }

  private async expireStalePayPalPayments() {
    const cutoff = new Date(
      Date.now() - this.pendingTtlMinutes() * 60 * 1000,
    );
    const stale = await this.prisma.bookingPayment.findMany({
      where: {
        provider: 'PAYPAL',
        status: PaymentRecordStatus.PENDING,
        createdAt: { lt: cutoff },
      },
      select: { id: true, bookingId: true, providerOrderId: true },
    });
    if (stale.length === 0) return 0;
    await this.prisma.bookingPayment.updateMany({
      where: { id: { in: stale.map((p) => p.id) } },
      data: {
        status: PaymentRecordStatus.FAILED,
        note: `PayPal order expired after ${this.pendingTtlMinutes()} minutes without approval`,
      },
    });
    await this.audit.log({
      entityType: 'BookingPayment',
      entityId: stale.map((p) => p.id).join(','),
      action: 'PAYPAL_ORDERS_EXPIRED',
      afterData: {
        count: stale.length,
        orders: stale.map((p) => p.providerOrderId).filter(Boolean),
      } as Prisma.InputJsonValue,
      changedBy: null,
    });
    return stale.length;
  }

  async cancelPayPalOrder(bookingId: string, actor: AuthenticatedUser) {
    const booking = await this.bookingForCustomer(bookingId, actor);
    const result = await this.prisma.bookingPayment.updateMany({
      where: {
        bookingId: booking.id,
        provider: 'PAYPAL',
        status: PaymentRecordStatus.PENDING,
      },
      data: {
        status: PaymentRecordStatus.FAILED,
        note: 'PayPal checkout was cancelled before payment',
      },
    });
    if (result.count > 0) {
      await this.audit.log({
        entityType: 'BookingPayment',
        entityId: booking.id,
        action: 'PAYPAL_ORDER_CANCELLED',
        afterData: { bookingRef: booking.bookingRef, count: result.count },
        changedBy: actor.id,
      });
    }
    return { cancelled: result.count };
  }

  async listBookingPayments(query: QueryBookingPaymentsDto) {
    await this.expireStalePayPalPayments();
    const { page, limit, payment, channel, search } = query;
    const where: Prisma.BookingWhereInput = {};
    if (payment) where.payment = payment;
    if (channel) where.channel = channel;
    const q = search?.trim();
    if (q) {
      where.OR = [
        { bookingRef: { contains: q, mode: 'insensitive' } },
        { confirmationCode: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { mail: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          tour: { select: { id: true, name: true, type: true } },
          customerUser: { select: { id: true, name: true, email: true } },
          payments: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.',
      );
    }
  }

  private async accessToken(): Promise<string> {
    this.assertConfigured();
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
      return this.tokenCache.value;
    }
    const basic = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.access_token) {
      this.logger.error(`PayPal token failed: ${res.status} ${JSON.stringify(body)}`);
      throw new BadGatewayException('PayPal authentication failed');
    }
    this.tokenCache = {
      value: body.access_token,
      expiresAt: now + Number(body.expires_in ?? 3000) * 1000,
    };
    return body.access_token;
  }

  private async request<T>(
    path: string,
    init: RequestInit & { idempotencyKey?: string } = {},
  ): Promise<T> {
    const token = await this.accessToken();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    if (init.idempotencyKey) {
      headers.set('PayPal-Request-Id', init.idempotencyKey);
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(20_000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`PayPal ${path} failed: ${res.status} ${JSON.stringify(body)}`);
      throw new BadGatewayException(
        body?.message || body?.details?.[0]?.description || 'PayPal request failed',
      );
    }
    return body as T;
  }

  private async bookingForCustomer(bookingId: string, actor: AuthenticatedUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tour: { select: { name: true } },
        payments: {
          where: { provider: 'PAYPAL' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (
      actor.role !== RoleType.ADMIN &&
      actor.role !== RoleType.OFFICE &&
      booking.customerUserId !== actor.id
    ) {
      throw new UnauthorizedException('This booking does not belong to you');
    }
    if (booking.channel !== BookingProvider.WEBSITE) {
      throw new BadRequestException('PayPal is only available for website bookings');
    }
    if (booking.payLater) {
      throw new BadRequestException('This booking is set to pay later');
    }
    if (booking.payment === PaymentStatus.PAID) {
      throw new ConflictException('Booking is already paid');
    }
    if (!booking.totalAmount || Number(booking.totalAmount) <= 0) {
      throw new BadRequestException('Booking total is missing');
    }
    return booking;
  }

  private providerAmount(bookingCurrency: string, amount: number) {
    if (bookingCurrency.toUpperCase() === this.currency) {
      return {
        value: Math.round(amount * 100) / 100,
        currency: this.currency,
        rate: 1,
      };
    }
    if (bookingCurrency.toUpperCase() === 'VND' && this.currency === 'USD') {
      const rate = this.vndPerUsd > 0 ? this.vndPerUsd : 25000;
      return {
        value: Math.round((amount / rate) * 100) / 100,
        currency: this.currency,
        rate,
      };
    }
    throw new BadRequestException(
      `Cannot convert ${bookingCurrency} to PayPal currency ${this.currency}`,
    );
  }

  async createPayPalOrder(bookingId: string, actor: AuthenticatedUser) {
    this.assertConfigured();
    await this.expireStalePayPalPayments();
    const booking = await this.bookingForCustomer(bookingId, actor);

    const reusable = booking.payments.find(
      (p) =>
        p.status === PaymentRecordStatus.PENDING &&
        p.providerOrderId &&
        Date.now() - new Date(p.createdAt).getTime() < 3 * 60 * 60 * 1000,
    );
    if (reusable?.providerOrderId) {
      return {
        orderId: reusable.providerOrderId,
        status: reusable.status,
        providerAmount: Number(reusable.providerAmount ?? 0),
        providerCurrency: reusable.providerCurrency,
        bookingTotal: Number(booking.totalAmount),
        bookingCurrency: booking.currency,
      };
    }

    const converted = this.providerAmount(
      booking.currency,
      Number(booking.totalAmount),
    );
    if (converted.value < 0.01) {
      throw new BadRequestException('PayPal amount is too small');
    }
    const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
    const idempotencyKey = `booking-${booking.id}-${converted.value}-${bucket}`;
    const order = await this.request<{
      id: string;
      status: string;
      links?: { rel: string; href: string }[];
    }>('/v2/checkout/orders', {
      method: 'POST',
      idempotencyKey,
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: booking.id,
            custom_id: booking.bookingRef,
            description: `${booking.tour?.name ?? 'Tour booking'} (${booking.bookingRef})`.slice(
              0,
              127,
            ),
            amount: {
              currency_code: converted.currency,
              value: converted.value.toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: 'Hana Tourist',
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
        },
      }),
    });
    if (!order?.id) {
      throw new BadGatewayException('PayPal did not return an order id');
    }

    const existing = await this.prisma.bookingPayment.findUnique({
      where: { providerOrderId: order.id },
    });
    if (existing) {
      return {
        orderId: order.id,
        status: existing.status,
        providerAmount: Number(existing.providerAmount ?? converted.value),
        providerCurrency: existing.providerCurrency,
        bookingTotal: Number(booking.totalAmount),
        bookingCurrency: booking.currency,
      };
    }

    try {
      await this.prisma.bookingPayment.create({
        data: {
          bookingId: booking.id,
          amount: new Prisma.Decimal(Number(booking.totalAmount)),
          currency: booking.currency,
          method: PaymentMethod.PAYPAL,
          payerType: PayerType.CUSTOMER,
          status: PaymentRecordStatus.PENDING,
          provider: 'PAYPAL',
          providerOrderId: order.id,
          providerAmount: new Prisma.Decimal(converted.value),
          providerCurrency: converted.currency,
          exchangeRate: new Prisma.Decimal(converted.rate),
          createdById: actor.id,
          note: 'PayPal order created',
          rawPayload: order as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      if ((e as { code?: string })?.code !== 'P2002') throw e;
    }

    return {
      orderId: order.id,
      status: order.status,
      approveUrl: order.links?.find((l) => l.rel === 'approve')?.href ?? null,
      providerAmount: converted.value,
      providerCurrency: converted.currency,
      bookingTotal: Number(booking.totalAmount),
      bookingCurrency: booking.currency,
    };
  }

  private captureDetails(order: any): PayPalCapture | null {
    const unit = order?.purchase_units?.[0];
    const captures = unit?.payments?.captures;
    return Array.isArray(captures) && captures.length ? captures[0] : null;
  }

  private async markCaptured(
    paymentId: string,
    capture: PayPalCapture,
    raw: unknown,
    note?: string,
  ) {
    const payment = await this.prisma.bookingPayment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });
    if (!payment) throw new NotFoundException('Payment record not found');
    if (payment.status === PaymentRecordStatus.PAID) return payment;

    const capturedValue = Number(capture.amount?.value ?? NaN);
    const capturedCurrency = String(capture.amount?.currency_code ?? '');
    const expectedValue = Number(payment.providerAmount ?? NaN);
    const expectedCurrency = String(payment.providerCurrency ?? '');
    if (
      !Number.isFinite(capturedValue) ||
      Math.abs(capturedValue - expectedValue) > 0.01 ||
      capturedCurrency !== expectedCurrency
    ) {
      await this.prisma.bookingPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentRecordStatus.FAILED,
          rawPayload: raw as Prisma.InputJsonValue,
          note: `Amount/currency mismatch: captured ${capturedValue} ${capturedCurrency}, expected ${expectedValue} ${expectedCurrency}`,
        },
      });
      throw new ConflictException('PayPal capture amount does not match the booking');
    }
    const captureId = capture.id ?? null;
    if (captureId) {
      const duplicate = await this.prisma.bookingPayment.findUnique({
        where: { providerCaptureId: captureId },
      });
      if (duplicate && duplicate.id !== payment.id) return duplicate;
    }

    const now = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.bookingPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentRecordStatus.PAID,
          providerCaptureId: captureId,
          paidAt: now,
          rawPayload: raw as Prisma.InputJsonValue,
          ...(note ? { note } : {}),
        },
      }),
      this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: {
          payment: PaymentStatus.PAID,
          paymentMethod: PaymentMethod.PAYPAL,
          paymentConfirmedAt: now,
          paymentConfirmedByName: 'PayPal',
          paymentNote: note ?? payment.booking.paymentNote,
        },
      }),
    ]);
    await this.audit.log({
      entityType: 'BookingPayment',
      entityId: payment.id,
      action: 'PAYPAL_CAPTURE',
      afterData: {
        status: PaymentRecordStatus.PAID,
        providerCaptureId: captureId,
        providerAmount: capturedValue,
        providerCurrency: capturedCurrency,
      } as Prisma.InputJsonValue,
      changedBy: null,
    });
    return updated;
  }

  async capturePayPalOrder(
    bookingId: string,
    orderId: string,
    actor: AuthenticatedUser,
    note?: string,
  ) {
    this.assertConfigured();
    const booking = await this.bookingForCustomer(bookingId, actor);
    const payment = await this.prisma.bookingPayment.findFirst({
      where: {
        bookingId: booking.id,
        provider: 'PAYPAL',
        providerOrderId: orderId,
      },
    });
    if (!payment) {
      throw new NotFoundException('PayPal order does not belong to this booking');
    }
    if (payment.status === PaymentRecordStatus.PAID) {
      return { status: 'COMPLETED', alreadyCaptured: true, paymentId: payment.id };
    }

    let order: any;
    try {
      order = await this.request('/v2/checkout/orders/' + encodeURIComponent(orderId) + '/capture', {
        method: 'POST',
        idempotencyKey: `capture-${orderId}`,
        body: '{}',
      });
    } catch {
      // Capture can fail as ALREADY_CAPTURED after a network retry. Re-read the
      // order and only accept it when PayPal reports a completed capture.
      order = await this.request('/v2/checkout/orders/' + encodeURIComponent(orderId), {
        method: 'GET',
      });
    }
    const capture = this.captureDetails(order);
    if (!capture || capture.status !== 'COMPLETED' || order?.status !== 'COMPLETED') {
      throw new ConflictException('PayPal payment is not completed');
    }
    const updated = await this.markCaptured(
      payment.id,
      capture,
      order,
      note ?? 'Paid with PayPal',
    );
    return {
      status: 'COMPLETED',
      paymentId: updated.id,
      orderId,
      captureId: capture.id ?? null,
    };
  }

  /**
   * OTA money is not direct customer cash. The booking is already marked PAID
   * by the OTA, while this receipt records the net remittance after commission
   * (or the actual gross/commission split) into the company's ledger.
   */
  async recordOtaRemittance(
    bookingId: string,
    dto: {
      netAmount: number;
      grossAmount?: number;
      commissionAmount?: number;
      paidAt?: string;
      reference?: string;
      note?: string;
    },
    actor: AuthenticatedUser,
  ) {
    const canManage =
      actor.role === RoleType.ADMIN ||
      (actor.role === RoleType.OFFICE &&
        !!actor.permissions?.includes('accounting.money.verify'));
    if (!canManage) {
      throw new UnauthorizedException(
        'Only Accounting can record an OTA remittance',
      );
    }
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (
      booking.channel === BookingProvider.WEBSITE ||
      booking.channel === BookingProvider.MANUAL
    ) {
      throw new BadRequestException(
        'Only OTA bookings use the remittance ledger',
      );
    }
    const net = Number(dto.netAmount);
    const gross =
      dto.grossAmount != null ? Number(dto.grossAmount) : undefined;
    const commission =
      dto.commissionAmount != null
        ? Number(dto.commissionAmount)
        : gross != null
          ? Math.round((gross - net) * 100) / 100
          : undefined;
    if (!Number.isFinite(net) || net <= 0) {
      throw new BadRequestException('Net remittance amount is required');
    }
    if (gross != null && gross + 0.01 < net) {
      throw new BadRequestException('Gross amount cannot be less than net');
    }
    if (commission != null && commission < 0) {
      throw new BadRequestException('Commission cannot be negative');
    }
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    if (Number.isNaN(paidAt.getTime())) {
      throw new BadRequestException('Invalid remittance date');
    }
    const payment = await this.prisma.bookingPayment.create({
      data: {
        bookingId: booking.id,
        amount: new Prisma.Decimal(net),
        currency: booking.currency,
        method: PaymentMethod.OTA,
        payerType: PayerType.OTA,
        status: PaymentRecordStatus.PAID,
        paidAt,
        grossAmount:
          gross != null ? new Prisma.Decimal(gross) : undefined,
        commissionAmount:
          commission != null
            ? new Prisma.Decimal(commission)
            : undefined,
        confirmedById: actor.id,
        confirmedByName: actor.name ?? actor.email ?? null,
        createdById: actor.id,
        note: [
          booking.channel,
          dto.reference ? `ref ${dto.reference}` : null,
          dto.note ?? null,
        ]
          .filter(Boolean)
          .join(' · '),
      },
    });
    await this.audit.log({
      entityType: 'BookingPayment',
      entityId: payment.id,
      action: 'OTA_REMITTANCE',
      afterData: {
        bookingId: booking.id,
        netAmount: net,
        grossAmount: gross ?? null,
        commissionAmount: commission ?? null,
        paidAt: paidAt.toISOString(),
        reference: dto.reference ?? null,
      } as Prisma.InputJsonValue,
      changedBy: actor.id,
    });
    return payment;
  }

  async verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
    event: any,
  ) {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
    if (!webhookId) {
      this.logger.error('PAYPAL_WEBHOOK_ID is not configured');
      throw new ServiceUnavailableException('PayPal webhook is not configured');
    }
    this.assertConfigured();
    const header = (name: string) => {
      const value = headers[name.toLowerCase()];
      return Array.isArray(value) ? value[0] : value;
    };
    const transmissionId = header('paypal-transmission-id');
    const transmissionTime = header('paypal-transmission-time');
    const certUrl = header('paypal-cert-url');
    const authAlgo = header('paypal-auth-algo');
    const transmissionSig = header('paypal-transmission-sig');
    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      throw new UnauthorizedException('Missing PayPal webhook signature headers');
    }
    const verification = await this.request<{ verification_status?: string }>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: event,
        }),
      },
    );
    if (verification.verification_status !== 'SUCCESS') {
      this.logger.warn(`PayPal webhook signature rejected: ${rawBody.slice(0, 200)}`);
      throw new UnauthorizedException('Invalid PayPal webhook signature');
    }
    return this.handleWebhookEvent(event);
  }

  private async handleWebhookEvent(event: any) {
    const type = String(event?.event_type ?? '');
    const resource = event?.resource ?? {};
    const related = resource?.supplementary_data?.related_ids ?? {};
    const orderId = related?.order_id ?? null;
    const captureId =
      related?.capture_id ??
      (type === "PAYMENT.CAPTURE.REFUNDED" ? null : (resource?.id ?? null));
    const payment = await this.prisma.bookingPayment.findFirst({
      where: orderId
        ? { provider: 'PAYPAL', providerOrderId: orderId }
        : captureId
          ? { provider: 'PAYPAL', providerCaptureId: captureId }
          : { id: '__never__' },
    });
    if (!payment) return { received: true, ignored: true };

    if (type === 'PAYMENT.CAPTURE.COMPLETED') {
      const capture: PayPalCapture = {
        id: captureId ?? undefined,
        status: resource?.status,
        amount: resource?.amount,
      };
      if (capture.status === 'COMPLETED') {
        await this.markCaptured(payment.id, capture, event, 'Paid with PayPal (webhook)');
      }
    } else if (type === 'PAYMENT.CAPTURE.REVERSED') {
      await this.prisma.bookingPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentRecordStatus.REFUNDED,
          rawPayload: event as Prisma.InputJsonValue,
          note: 'PayPal capture reversed',
        },
      });
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { payment: PaymentStatus.REFUNDED },
      });
    } else if (type === 'PAYMENT.CAPTURE.DENIED') {
      await this.prisma.bookingPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentRecordStatus.FAILED,
          rawPayload: event as Prisma.InputJsonValue,
          note: 'PayPal capture denied',
        },
      });
    } else if (type === 'PAYMENT.CAPTURE.REFUNDED') {
      await this.prisma.bookingPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentRecordStatus.REFUNDED,
          rawPayload: event as Prisma.InputJsonValue,
          note: 'PayPal capture refunded',
        },
      });
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { payment: PaymentStatus.REFUNDED },
      });
    }
    return { received: true };
  }
}
