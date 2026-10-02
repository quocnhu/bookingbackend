/* eslint-disable no-console */
/**
 * Fake-email simulation (no real Gmail/Pub/Sub needed — the backend must be
 * running so BullMQ ParsingProcessor can consume the queue):
 *  1. Create a fake "box" (tracked GmailAccount) if it does not exist yet.
 *  2. Insert rawData + enqueue a parse job — exactly the output of
 *     GmailPubSubService.handlePush() after fetchMessage().
 *  3. Wait for the backend worker to process → parser → validate → booking upsert.
 *  4. Print rawData statuses + bookings.
 *
 * Run: npx tsx fake-email.sim.ts
 */
import 'tsconfig-paths/register';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { PARSE_QUEUE, PARSE_JOB } from './src/parsing/parsing.queue';

const prisma = new PrismaClient();
const parseQueue = new Queue(PARSE_QUEUE, {
  connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
});

const FAKE_BOX = process.env.GOOGLE_ALLOWED_EMAIL || 'nquocnhu95it@gmail.com';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function tripadvisorHtml(): string {
  return `
    <table border="0" cellpadding="6">
      <tr><td><b>Booking Ref.</b></td><td>VIA-91235617</td></tr>
      <tr><td><b>Product Booking Ref.</b></td><td>Hana-T130151029</td></tr>
      <tr><td><b>Product</b></td><td>HANA TOURIST - Cu Chi Tunnels</td></tr>
      <tr><td><b>Supplier</b></td><td>HANA TOURIST</td></tr>
      <tr><td><b>Sold By</b></td><td>Viator.com</td></tr>
      <tr><td><b>Booking Channel</b></td><td>Viator</td></tr>
      <tr><td><b>Customer</b></td><td>MUNRO, Rowland</td></tr>
      <tr><td><b>Customer Email</b></td><td>rowland.munro@test.com</td></tr>
      <tr><td><b>Customer Phone</b></td><td>+84 912 345 678</td></tr>
      <tr><td><b>Date</b></td><td>Thu 14.May '26 @ 07:30</td></tr>
      <tr><td><b>Rate</b></td><td>Shared Group Of 10 Max</td></tr>
      <tr><td><b>Pax</b></td><td>2 Adult</td></tr>
      <tr><td><b>Pick-up</b></td><td>Sunrise Grand Hotel, 12 Nguyen Hue St, HCMC</td></tr>
      <tr><td><b>Guided Languages</b></td><td>English</td></tr>
    </table>`;
}

const SAMPLES: Array<Record<string, unknown>> = [
  {
    messageId: 'fake-msg-tripadvisor',
    threadId: 'fake-thread-tripadvisor',
    emailAddress: FAKE_BOX,
    subject: 'Your TripAdvisor booking VIA-91235617 is confirmed',
    from: 'bookings@tripadvisor.com',
    date: 'Mon, 10 Aug 2026 09:00:00 +0700',
    snippet: 'Your tour with HANA TOURIST is confirmed',
    body: "Booking Ref.: VIA-91235617\nCustomer: MUNRO, Rowland\nDate: Thu 14.May '26 @ 07:30",
    html: tripadvisorHtml(),
    internalDate: '1786388400000',
    historyId: 90000000000001,
  },
  {
    messageId: 'fake-msg-airbnb',
    threadId: 'fake-thread-airbnb',
    emailAddress: FAKE_BOX,
    subject: 'Reservation confirmed: HCMC Riverside Retreat (HM2X8K4N1)',
    from: 'reservations@airbnb.com',
    date: 'Mon, 10 Aug 2026 10:00:00 +0700',
    snippet: 'Check-in Sat Aug 22 2026',
    body:
      "Hi Nguyen,\nYour reservation H2X8K4N1 is confirmed.\nGuest: Mai Anh Le\nCheck-in: Aug 22, 2026\nCheck-out: Aug 24, 2026\n2 guests\nWhere you'll be: 12 Le Thanh Ton, District 1, HCMC",
    internalDate: '1786392000000',
    historyId: 90000000000002,
  },
  {
    messageId: 'fake-msg-bookingcom',
    threadId: 'fake-thread-bookingcom',
    emailAddress: FAKE_BOX,
    subject: 'Booking confirmation · Novotel Saigon Centre',
    from: 'confirmation@booking.com',
    date: 'Mon, 10 Aug 2026 11:00:00 +0700',
    snippet: 'Reservation number 9856472130',
    body:
      'Hi Nguyen,\nBooking confirmation\nReservation number: 9856472130\nHotel: Novotel Saigon Centre\nAddress: 167 Hai Ba Trung, District 3, HCMC\nCheck-in: 22 Aug 2026\n2 adults',
    internalDate: '1786395600000',
    historyId: 90000000000003,
  },
  {
    messageId: 'fake-msg-website',
    threadId: 'fake-thread-website',
    emailAddress: FAKE_BOX,
    subject: 'New booking from website — WEB-3286',
    from: 'no-reply@website.local',
    date: 'Mon, 10 Aug 2026 12:00:00 +0700',
    snippet: 'New website booking',
    body: 'Website booking WEB-3286 created.',
    booking: {
      bookingRef: 'WEB-3286',
      tourName: 'Mekong Delta 1 Day',
      packageName: 'Shared Group Of 12 Max 8:00 AM',
      tripDate: '2026-08-28T08:00:00.000Z',
      travellers: 4,
      billingName: 'Tran Van Binh',
      billingEmail: 'binh.tran@test.com',
      billingCity: 'HCMC',
      priceLines: 'Adult: 4x$35=$140',
      totalcost: 140,
    },
    internalDate: '1786399200000',
    historyId: 90000000000004,
  },
];

async function main() {
  // ── 1. Fake box ──
  const box = await prisma.gmailAccount.upsert({
    where: { email: FAKE_BOX },
    update: {},
    create: {
      email: FAKE_BOX,
      refreshToken: 'fake-refresh-token-for-simulation',
      lastHistoryId: '90000000000000',
      watchExpiration: new Date(Date.now() + 6 * 86400000),
    },
  });
  console.log(`✅ Fake box ready: ${box.email} (id=${box.id})`);
  console.log(
    `   watchExpiration=${box.watchExpiration.toISOString()} · lastHistoryId=${box.lastHistoryId}`,
  );
  console.log(
    `   → Treat this as the Gmail watch + Pub/Sub subscription pointing at the webhook.`,
  );

  // ── 2. Insert rawData + enqueue parse (same as handlePush after fetchMessage) ──
  console.log('\n▶ Simulating ingestion → rawData → enqueue parse...');
  const ids: string[] = [];
  for (const sample of SAMPLES) {
    const sourceId = `gmail-${sample.messageId as string}`;
    const existing = await prisma.rawData.findUnique({ where: { sourceId } });
    const payloadHash = createHash('sha256')
      .update(JSON.stringify(sample))
      .digest('hex');
    const raw = existing
      ? existing
      : await prisma.rawData.create({
          data: {
            sourceId,
            email: FAKE_BOX,
            templateTag: 'unknown',
            payloadHash,
            payload: sample as any,
            status: 'pending',
          },
        });
    ids.push(raw.id);
    await parseQueue.add(
      PARSE_JOB,
      { rawDataId: raw.id },
      { jobId: `parse-${raw.id}`, attempts: 3 },
    );
    console.log(
      `   → rawData ${raw.id.slice(0, 8)}… enqueued (msg ${sample.messageId})`,
    );
  }

  // ── 3. Wait for the backend worker to process ──
  console.log('\n⏳ Waiting for ParsingProcessor (backend) to consume the parse queue...');
  const deadline = Date.now() + 30000;
  let statuses: Array<{ sourceId: string; status: string; templateTag: string | null }> = [];
  while (Date.now() < deadline) {
    await sleep(1500);
    statuses = await prisma.rawData.findMany({
      where: { email: FAKE_BOX },
      select: { sourceId: true, status: true, templateTag: true },
      orderBy: { createdAt: 'asc' },
    });
    if (statuses.every((s) => s.status !== 'pending')) break;
  }

  console.log('\n📦 RawData statuses:');
  for (const r of statuses) {
    const icon = r.status === 'parsed' ? '✓' : r.status === 'parse_failed' ? '✗' : '…';
    console.log(
      `   ${icon} ${r.sourceId} → status=${r.status} (tag=${r.templateTag ?? 'unknown'})`,
    );
  }

  // ── 4. Verify bookings ──
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  console.log('\n🎫 Bookings (10 most recent):');
  if (bookings.length === 0) console.log('   (no bookings yet)');
  for (const b of bookings) {
    console.log(
      `   • ${b.bookingRef} | channel=${b.channel} | status=${b.status} | customer=${b.customerName ?? '—'} | start=${b.startingDate?.toISOString() ?? '—'}`,
    );
  }

  const parsed = statuses.filter((s) => s.status === 'parsed').length;
  const failed = statuses.filter((s) => s.status === 'parse_failed').length;
  const pending = statuses.filter((s) => s.status === 'pending').length;
  console.log(
    `\n📊 Summary: ${parsed} parsed · ${failed} parse_failed · ${pending} still pending`,
  );

  await parseQueue.close();
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Simulation failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
