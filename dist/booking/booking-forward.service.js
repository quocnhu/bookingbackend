"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var BookingForwardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingForwardService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const ioredis_1 = __importDefault(require("ioredis"));
const prisma_service_1 = require("../prisma/prisma.service");
const gmail_auth_provider_1 = require("../ingestion/gmail-auth.provider");
const redis_constants_1 = require("../common/redis/redis.constants");
const booking_forward_constants_1 = require("./booking-forward.constants");
let BookingForwardService = BookingForwardService_1 = class BookingForwardService {
    prisma;
    config;
    auth;
    redis;
    logger = new common_1.Logger(BookingForwardService_1.name);
    constructor(prisma, config, auth, redis) {
        this.prisma = prisma;
        this.config = config;
        this.auth = auth;
        this.redis = redis;
    }
    async forward(input) {
        let duplicateClaimKey;
        try {
            if (!this.isEnabled())
                return { sent: false, reason: 'DISABLED' };
            const recipients = this.recipients();
            if (recipients.length === 0) {
                return { sent: false, reason: 'NO_RECIPIENT' };
            }
            if ((input.subject ?? '')
                .trimStart()
                .startsWith(booking_forward_constants_1.BOOKING_SYNC_SUBJECT_PREFIX)) {
                return { sent: false, reason: 'SYSTEM_NOTICE' };
            }
            const account = await this.prisma.gmailAccount.findUnique({
                where: { email: input.mailbox },
                select: { refreshToken: true },
            });
            if (!account) {
                this.logger.warn(`Cannot forward ${input.bookingRef}: mailbox ${input.mailbox} is not tracked`);
                return { sent: false, reason: 'MAILBOX_NOT_TRACKED' };
            }
            const isDuplicateOutcome = input.outcome === 'SKIPPED' || input.outcome === 'UNCHANGED';
            if (isDuplicateOutcome) {
                try {
                    const duplicateRows = await this.prisma.rawData.count({
                        where: {
                            linkedBooking: { bookingRef: input.bookingRef },
                            outcome: { in: ['SKIPPED', 'UNCHANGED'] },
                        },
                    });
                    if (duplicateRows > 1) {
                        this.logger.log(`Suppressed duplicate notice for ${input.bookingRef} — an earlier duplicate was already handled`);
                        return { sent: false, reason: 'DUPLICATE_NOTICE_SUPPRESSED' };
                    }
                }
                catch (err) {
                    this.logger.warn(`Duplicate-notice history check failed for ${input.bookingRef}: ${err.message}`);
                }
                duplicateClaimKey = (0, booking_forward_constants_1.duplicateNoticeKey)(input.mailbox, input.bookingRef);
                try {
                    const claimed = await this.redis?.set(duplicateClaimKey, '1', 'EX', booking_forward_constants_1.DUPLICATE_NOTICE_TTL_SECONDS, 'NX');
                    if (claimed === null) {
                        this.logger.log(`Suppressed duplicate notice for ${input.bookingRef} — one was already sent`);
                        return { sent: false, reason: 'DUPLICATE_NOTICE_SUPPRESSED' };
                    }
                }
                catch (err) {
                    this.logger.warn(`Duplicate-notice claim failed for ${input.bookingRef}: ${err.message}`);
                }
            }
            const raw = this.buildRawMessage(input, recipients);
            const gmail = this.auth.getGmailClient(account.refreshToken);
            const threadId = (input.threadId ?? '').trim() || undefined;
            const result = await gmail.users.messages.send({
                userId: 'me',
                requestBody: { raw, ...(threadId ? { threadId } : {}) },
            });
            this.logger.log(`Forwarded ${input.bookingRef} (${input.outcome}) to ${recipients.join(', ')} — gmail id ${result.data.id}`);
            return { sent: true };
        }
        catch (err) {
            if (duplicateClaimKey && this.redis) {
                try {
                    await this.redis.del(duplicateClaimKey);
                }
                catch {
                }
            }
            const e = err;
            const hint = e.code === 403 || /insufficient|scope/i.test(e.message ?? '')
                ? ' (reconnect the mailbox to grant the gmail.send scope)'
                : '';
            this.logger.error(`Failed to forward ${input.bookingRef}: ${e.message ?? err}${hint}`);
            return { sent: false, reason: 'SEND_FAILED' };
        }
    }
    buildRawMessage(input, recipients) {
        const alt = `booking-sync-alt-${(0, crypto_1.randomUUID)()}`;
        const subject = this.encodeHeader(this.subjectFor(input));
        const text = this.textBody(input);
        const html = this.htmlBody(input);
        const inReplyTo = this.threadMessageId(input.rfcMessageId);
        const threadHeaders = inReplyTo
            ? [`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`]
            : [];
        const mime = [
            'MIME-Version: 1.0',
            `To: ${recipients.join(', ')}`,
            `Subject: ${subject}`,
            `Date: ${new Date().toUTCString()}`,
            `Message-ID: <${(0, crypto_1.randomUUID)()}@booking.local>`,
            ...threadHeaders,
            `${booking_forward_constants_1.BOOKING_SYNC_HEADER}: ${booking_forward_constants_1.BOOKING_SYNC_HEADER_VALUE}`,
            `Content-Type: multipart/alternative; boundary="${alt}"`,
            '',
            `--${alt}`,
            'Content-Type: text/plain; charset="UTF-8"',
            'Content-Transfer-Encoding: base64',
            '',
            this.base64Lines(text),
            `--${alt}`,
            'Content-Type: text/html; charset="UTF-8"',
            'Content-Transfer-Encoding: base64',
            '',
            this.base64Lines(html),
            `--${alt}--`,
            '',
        ].join('\r\n');
        return Buffer.from(mime, 'utf-8').toString('base64url');
    }
    subjectFor(input) {
        const original = (input.subject ?? '').trim();
        if (original) {
            const bare = original.replace(/^(?:(?:re|fw|fwd)\s*:\s*)+/i, '');
            return `Re: ${bare}`;
        }
        if (input.outcome === 'SKIPPED') {
            return `${booking_forward_constants_1.BOOKING_SYNC_SUBJECT_PREFIX} ${input.bookingRef} - duplication mail blocked (already processed/exists)`;
        }
        const label = input.outcome === 'CREATED'
            ? 'new booking'
            : input.outcome === 'CANCELLED'
                ? 'cancellation'
                : input.outcome === 'UNCHANGED'
                    ? 'duplication/unchanged - blocked'
                    : 'amendment';
        return `${booking_forward_constants_1.BOOKING_SYNC_SUBJECT_PREFIX} ${input.bookingRef} - ${label} pushed to Booking table`;
    }
    threadMessageId(value) {
        const id = (value ?? '').trim();
        return /^<[^<>\s]+>$/.test(id) ? id : undefined;
    }
    textBody(input) {
        const meta = [
            `Booking ref: ${input.bookingRef}`,
            `Source: ${input.source ?? '-'}`,
            `Action: ${input.action ?? '-'} -> ${input.outcome ?? '-'}`,
            `Mailbox: ${input.mailbox}`,
            `Processed: ${new Date().toISOString()}`,
        ].join('\n');
        const original = [
            '----- Original message -----',
            `From: ${input.from ?? '-'}`,
            `Date: ${input.date ?? '-'}`,
            `Subject: ${input.subject ?? '-'}`,
            '',
            input.body?.trim() ? input.body.trim() : '(no text body)',
        ].join('\n');
        const header = input.outcome === 'SKIPPED' || input.outcome === 'UNCHANGED'
            ? `This mail with booking ref "${input.bookingRef}" ${booking_forward_constants_1.BOOKING_SYNC_DUPLICATE_BODY_MARKER}.`
            : `This mail with booking ref "${input.bookingRef}" ${booking_forward_constants_1.BOOKING_SYNC_BODY_MARKER}.`;
        return [header, '', meta, '', original, ''].join('\n');
    }
    htmlBody(input) {
        const row = (label, value) => `<tr><td style="padding:2px 12px 2px 0;color:#8c8c8c">${this.escapeHtml(label)}</td><td>${this.escapeHtml(value)}</td></tr>`;
        const header = input.outcome === 'SKIPPED' || input.outcome === 'UNCHANGED'
            ? `This mail with booking ref &quot;${this.escapeHtml(input.bookingRef)}&quot; ${booking_forward_constants_1.BOOKING_SYNC_DUPLICATE_BODY_MARKER}.`
            : `This mail with booking ref &quot;${this.escapeHtml(input.bookingRef)}&quot; ${booking_forward_constants_1.BOOKING_SYNC_BODY_MARKER}.`;
        return [
            '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f1f1f">',
            `<p style="margin:0 0 12px;font-size:15px"><strong>${header}</strong></p>`,
            '<table style="border-collapse:collapse;font-size:13px">',
            row('Source', input.source ?? '-'),
            row('Action', `${input.action ?? '-'} -&gt; ${input.outcome ?? '-'}`),
            row('Mailbox', input.mailbox),
            row('Processed', new Date().toISOString()),
            '</table>',
            '<hr style="border:none;border-top:1px solid #e8e8e8;margin:16px 0" />',
            '<p style="margin:0 0 6px;color:#8c8c8c;font-size:12px"><strong>Original message</strong></p>',
            `<p style="margin:0 0 10px;font-size:12px;color:#595959">From: ${this.escapeHtml(input.from ?? '-')}<br/>Date: ${this.escapeHtml(input.date ?? '-')}<br/>Subject: ${this.escapeHtml(input.subject ?? '-')}</p>`,
            `<pre style="white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:13px;margin:0">${this.escapeHtml(input.body?.trim() ? input.body.trim() : '(no text body)')}</pre>`,
            '</div>',
        ].join('');
    }
    encodeHeader(value) {
        const clean = value.replace(/[\r\n]+/g, ' ').trim();
        if (/^[\x20-\x7E]*$/.test(clean))
            return clean;
        return `=?UTF-8?B?${Buffer.from(clean, 'utf-8').toString('base64')}?=`;
    }
    base64Lines(value) {
        return Buffer.from(value, 'utf-8')
            .toString('base64')
            .replace(/(.{76})/g, '$1\r\n');
    }
    escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    isEnabled() {
        const raw = this.config.get('BOOKING_FORWARD_ENABLED');
        return (raw ?? 'false').toLowerCase() === 'true';
    }
    recipients() {
        const raw = this.config.get('BOOKING_FORWARD_TO') ?? '';
        return raw
            .split(/[,\s;]+/)
            .map((s) => s.trim())
            .filter((s) => /^[^@\s]+@[^@\s]+$/.test(s));
    }
};
exports.BookingForwardService = BookingForwardService;
exports.BookingForwardService = BookingForwardService = BookingForwardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Optional)()),
    __param(3, (0, common_1.Inject)(redis_constants_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        gmail_auth_provider_1.GmailAuthService,
        ioredis_1.default])
], BookingForwardService);
//# sourceMappingURL=booking-forward.service.js.map