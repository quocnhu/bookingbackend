/**
 * Temporary E2E check: a Viator "Conversation with …" mail → booking.
 * Run: npx ts-node -r tsconfig-paths/register e2e-advanced-viator.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';
import { RawDataService } from './src/raw-data/raw-data.service';
import { ParsingQueue } from './src/parsing/parsing.queue';
import {
  parseTemplateRules,
  resolveTemplateTag,
} from './src/parsing/template.util';

const MAIL = {
  messageId: 'e2e-advanced-viator-1',
  threadId: 'e2e-thread-1',
  emailAddress: 'nquocnhu95it@gmail.com',
  subject: 'Conversation with Pablo M about Viator booking BR-1457720525',
  from: 'Viator <NOT-48586e7a-6d5c-4a30-a2f1-c3b1e5b0a111@expmessaging.tripadvisor.com>',
  date: 'Mon, 19 Oct 2026 06:46:00 +0700',
  body: `##^- Please type your reply above this line -^##

Booking Reference: BR-1457720525

Pablo M wrote:

Hi James,

This is Pablo Madrigal (2 adults, with my wife Paloma). Booking 1787449424
/ ref 1457720525, Cu Chi Ben Duoc tour today, October 19, 7:30 AM.

My WhatsApp number is +506 7105 9897. Please message us there so the guide
can confirm the pickup time.

Pickup point: Emerald Apartments, 107/11 Truong Dinh, Ward 6, District 3.
We will wait in the lobby.

Thank you,
Pablo

View conversation in Management Center

Booking details
Product name: Cu Chi Ben Duoc Tunnels: Authentic & Less Touristy (Max 10)
Product Option: Shared Group Morning/Noon Trip 07:30
Lead Traveler: Pablo Madrigal
Phone number: +66 2 030 4763
Booking Reference: BR-1457720525
Travel date/Pax: Mon Oct 19, 2026 - 2 Adults
© 2024 Viator, Inc. All rights reserved.`,
};

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);
  const rawDataService = app.get(RawDataService);
  const queue = app.get(ParsingQueue);

  // 1) The env rule routes the mail to the new template.
  const rules = parseTemplateRules(
    process.env.MAIL_TEMPLATE_PREFIX_RULES ??
      'subject:conversation with=advancedViator',
  );
  const tag = resolveTemplateTag(
    { subject: MAIL.subject, from: MAIL.from },
    rules,
  );
  console.log('resolved template tag :', tag);
  console.log('rules                 :', JSON.stringify(rules));

  // 2) Ingest + parse.
  const { id } = await rawDataService.createIngested({
    sourceId: `gmail-${MAIL.messageId}`,
    email: MAIL.emailAddress,
    templateTag: tag,
    payload: { ...MAIL },
  });
  console.log('rawData id            :', id);
  await queue.enqueue(id);

  // 3) Wait for the worker.
  let raw: { status: string; action: string | null; outcome: string | null; linkedBookingId: string | null } | null =
    null;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    raw = await prisma.rawData.findUnique({
      where: { id },
      select: {
        status: true,
        action: true,
        outcome: true,
        linkedBookingId: true,
      },
    });
    if (raw && raw.status !== 'pending') break;
  }
  console.log('rawData               :', JSON.stringify(raw));

  if (raw?.linkedBookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: raw.linkedBookingId },
      select: {
        bookingRef: true,
        source: true,
        channel: true,
        customerName: true,
        mail: true,
        phone: true,
        tourName: true,
        tourType: true,
        totalPax: true,
        paxDetail: true,
        hotelName: true,
        address: true,
        startingDate: true,
        status: true,
        extra: true,
      },
    });
    console.log('booking               :', JSON.stringify(booking, null, 2));
  }

  // 4) The same booking again → must UPDATE, not duplicate.
  await queue.enqueue(id);
  await new Promise((r) => setTimeout(r, 3000));
  const bookings = await prisma.booking.count({
    where: { bookingRef: 'BR-1457720525', source: 'viator' },
  });
  console.log('bookings with that ref:', bookings);

  await prisma.rawData.delete({ where: { id } });
  await prisma.booking.deleteMany({
    where: { bookingRef: 'BR-1457720525', source: 'viator' },
  });
  console.log('cleaned up');

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
