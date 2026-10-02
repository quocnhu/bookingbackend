import 'dotenv/config';
import {
  PrismaClient,
  AuthProvider,
  FeeFlowType,
  RoleType,
  TourType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';

const prisma = new PrismaClient();

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');
const GALLERY_SHOTS = 3;

/**
 * Generate a local thumbnail image for a tour and return the public URL.
 * Stored at uploads/tours/{tourId}/thumbnail.webp, served by backend at /uploads.
 */
async function seedThumbnail(
  tourId: string,
  code: string,
  name: string,
  accent: { from: string; to: string },
): Promise<string> {
  const folder = path.join(UPLOADS_ROOT, 'tours', tourId);
  await fs.promises.mkdir(folder, { recursive: true });
  const escapeXml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  const svg =
    `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${accent.from}"/><stop offset="100%" stop-color="${accent.to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="800" height="600" fill="url(#g)"/>` +
    `<circle cx="680" cy="120" r="140" fill="rgba(255,255,255,0.10)"/>` +
    `<circle cx="120" cy="500" r="180" fill="rgba(255,255,255,0.08)"/>` +
    `<text x="400" y="280" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="#ffffff" text-anchor="middle">${escapeXml(code)}</text>` +
    `<text x="400" y="340" font-family="Arial, sans-serif" font-size="22" fill="rgba(255,255,255,0.9)" text-anchor="middle">${escapeXml(name)}</text>` +
    `</svg>`;
  const file = path.join(folder, 'thumbnail.webp');
  await sharp(Buffer.from(svg))
    .resize(800, 600)
    .webp({ quality: 85 })
    .toFile(file);
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
  return `${backendUrl}/uploads/tours/${tourId}/thumbnail.webp`;
}

/**
 * Folder-based gallery: writes local placeholder images into the tour's image folder
 * (uploads/tours/{tourId}/gallery). No DB records needed — the frontend reads the folder directly.
 */
async function seedGalleryImages(
  tourId: string,
  code: string,
  count = GALLERY_SHOTS,
) {
  const folder = path.join(UPLOADS_ROOT, 'tours', tourId, 'gallery');
  await fs.promises.mkdir(folder, { recursive: true });
  const palettes = [
    { from: '#22d3ee', to: '#3b82f6' },
    { from: '#8b5cf6', to: '#ec4899' },
    { from: '#10b981', to: '#22d3ee' },
  ];
  for (let i = 0; i < count; i++) {
    const { from, to } = palettes[i % palettes.length];
    const svg =
      `<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>` +
      `</linearGradient></defs>` +
      `<rect width="1200" height="800" fill="url(#g)"/>` +
      `<circle cx="950" cy="180" r="160" fill="rgba(255,255,255,0.12)"/>` +
      `<circle cx="180" cy="640" r="220" fill="rgba(255,255,255,0.10)"/>` +
      `<text x="600" y="400" font-family="Arial, sans-serif" font-size="76" font-weight="700" fill="#ffffff" text-anchor="middle">${code}</text>` +
      `<text x="600" y="462" font-family="Arial, sans-serif" font-size="30" fill="rgba(255,255,255,0.85)" text-anchor="middle">Photo ${i + 1}</text>` +
      `</svg>`;
    const file = path.join(
      folder,
      `${String(i).padStart(3, '0')}-seed-${i}.webp`,
    );
    await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(file);
  }
}

const DEFAULT_PERMISSIONS: Array<{
  code: string;
  name: string;
  group: string;
}> = [
  { code: 'dashboard.read', name: 'Xem dashboard', group: 'Dashboard' },
  { code: 'booking.read', name: 'Xem booking', group: 'Booking' },
  { code: 'booking.create', name: 'Tạo booking', group: 'Booking' },
  { code: 'booking.update', name: 'Sửa booking', group: 'Booking' },
  { code: 'booking.delete', name: 'Xoá booking', group: 'Booking' },
  { code: 'assignment.read', name: 'Xem assignment', group: 'Assignment' },
  { code: 'assignment.create', name: 'Tạo assignment', group: 'Assignment' },
  { code: 'assignment.update', name: 'Sửa assignment', group: 'Assignment' },
  { code: 'assignment.delete', name: 'Xoá assignment', group: 'Assignment' },
  {
    code: 'booking.note.update',
    name: 'Sửa ghi chú booking của chuyến mình',
    group: 'Assignment',
  },
  {
    code: 'assignment.tour-report.submit',
    name: 'Nộp báo cáo chuyến đi',
    group: 'Assignment',
  },
  { code: 'company.read', name: 'Xem hồ sơ công ty', group: 'Company' },
  { code: 'company.update', name: 'Cập nhật hồ sơ công ty', group: 'Company' },
  { code: 'tour.create', name: 'Tạo tour', group: 'Tour' },
  { code: 'tour.update', name: 'Sửa tour', group: 'Tour' },
  { code: 'tour.delete', name: 'Xoá tour', group: 'Tour' },
  { code: 'tour.itinerary.edit', name: 'Sửa itinerary tour', group: 'Tour' },
  { code: 'user.read', name: 'Xem user', group: 'User' },
  { code: 'user.create', name: 'Tạo user', group: 'User' },
  { code: 'user.update', name: 'Sửa user', group: 'User' },
  { code: 'user.delete', name: 'Xoá user', group: 'User' },
  { code: 'gmail.manage', name: 'Quản lý mailbox Gmail', group: 'System' },
  { code: 'role.manage', name: 'Quản lý role/permission', group: 'System' },
  { code: 'audit.read', name: 'Xem audit log', group: 'System' },
  { code: 'auth.read', name: 'Xem lịch sử đăng nhập', group: 'System' },
  { code: 'coordinate.create', name: 'Tạo coordinate', group: 'Coordinate' },
  { code: 'coordinate.update', name: 'Sửa coordinate', group: 'Coordinate' },
  { code: 'coordinate.delete', name: 'Xoá coordinate', group: 'Coordinate' },
  { code: 'route-price.create', name: 'Tạo route price', group: 'Route Price' },
  { code: 'route-price.update', name: 'Sửa route price', group: 'Route Price' },
  { code: 'route-price.delete', name: 'Xoá route price', group: 'Route Price' },
  { code: 'vehicle.create', name: 'Tạo xe (provider)', group: 'Vehicle' },
  { code: 'vehicle.update', name: 'Sửa xe (provider)', group: 'Vehicle' },
  { code: 'vehicle.delete', name: 'Xoá xe (provider)', group: 'Vehicle' },
  {
    code: 'provider.create',
    name: 'Tạo transportation provider',
    group: 'Provider',
  },
  { code: 'driver.create', name: 'Tạo tài xế', group: 'Provider Driver' },
  { code: 'driver.update', name: 'Sửa tài xế', group: 'Provider Driver' },
  {
    code: 'provider-driver.assign',
    name: 'Gán tài xế vào provider',
    group: 'Provider Driver',
  },
  {
    code: 'provider-driver.unassign',
    name: 'Gỡ tài xế khỏi provider',
    group: 'Provider Driver',
  },
  { code: 'accounting.read', name: 'Xem Accounting Room', group: 'Accounting' },
  {
    code: 'accounting.settlement.create',
    name: 'Thêm khoản thu/chi',
    group: 'Accounting',
  },
  {
    code: 'accounting.settlement.update',
    name: 'Sửa khoản thu/chi',
    group: 'Accounting',
  },
  {
    code: 'accounting.settlement.delete',
    name: 'Xoá khoản thu/chi',
    group: 'Accounting',
  },
  {
    code: 'accounting.category.create',
    name: 'Tạo danh mục thu/chi',
    group: 'Accounting',
  },
  {
    code: 'accounting.money.verify',
    name: 'Xác minh & khoá tiền chuyến',
    group: 'Accounting',
  },
  {
    code: 'accounting.money.reject',
    name: 'Trả lại bảng kê thu/chi',
    group: 'Accounting',
  },
  {
    code: 'accounting.period.export',
    name: 'Xuất kỳ thanh toán',
    group: 'Accounting',
  },
  {
    code: 'accounting.period.void',
    name: 'Huỷ kỳ thanh toán đã xuất',
    group: 'Accounting',
  },
];

/** Default settlement categories. flowType decides who owes whom. */
const DEFAULT_SETTLEMENT_CATEGORIES: Array<{
  code: string;
  name: string;
  flowType: FeeFlowType;
}> = [
  {
    code: 'COLLECT_ON_BEHALF',
    name: 'Thu hộ COD',
    flowType: FeeFlowType.COLLECT_MONEY,
  },
  {
    code: 'CUSTOMER_PAYMENT',
    name: 'Thu tiền khách',
    flowType: FeeFlowType.COLLECT_MONEY,
  },
  {
    code: 'GUIDE_COMMISSION',
    name: 'Hoa hồng HDV',
    flowType: FeeFlowType.COLLECT_MONEY,
  },
  { code: 'VEHICLE_FEE', name: 'Phí xe', flowType: FeeFlowType.PAY_MONEY },
  { code: 'DRIVER_PAY', name: 'Lương tài xế', flowType: FeeFlowType.PAY_MONEY },
  {
    code: 'RESTAURANT',
    name: 'Tiền nhà hàng',
    flowType: FeeFlowType.PAY_MONEY,
  },
  { code: 'TOLL_FEE', name: 'Phí cầu đường', flowType: FeeFlowType.PAY_MONEY },
  { code: 'FUEL', name: 'Nhiên liệu', flowType: FeeFlowType.PAY_MONEY },
  { code: 'OTHERS', name: 'Khác', flowType: FeeFlowType.PAY_MONEY },
];

interface TourSeed {
  code: string;
  name: string;
  type: TourType;
  accent: { from: string; to: string };
  adultPrice: number;
  childPrice: number;
  infantPrice: number;
  currency: string;
  durationDays: number;
  departureLocation?: string;
  transportation?: string;
  overview?: string;
  includedServices?: string;
  excludedServices?: string;
  childrenPolicy?: string;
  regulations?: string;
  highlights?: string;
  insurancePolicy?: string;
  mapQuery?: string;
  gallery?: Array<{ url: string }>;
  departures?: Array<{
    departureDate: string;
    adultPrice: number;
    childPrice: number;
    infantPrice: number;
  }>;
  itineraries: Array<{
    dayNumber: number;
    orderIndex: number;
    title: string;
    description?: string;
    timeSlot?: string;
    location?: string;
  }>;
}

// Local image storage served by the backend at /uploads (will be swapped for S3 later)
const IMG = (file: string, alt: string) =>
  `<img src="http://localhost:4000/uploads/seeds/${file}.jpg" alt="${alt}" />`;

const UL = (items: string[]) =>
  `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const P = (text: string) => `<p>${text}</p>`;
const INSURANCE = () =>
  `<p>All guests are covered by <strong>travel insurance</strong> during the tour itinerary. Personal belongings are the guest's own responsibility.</p>` +
  UL([
    'Medical assistance & emergency transport during the tour',
    'Coverage for the full duration listed on this itinerary',
    'Excludes pre-existing conditions and optional activities not listed',
  ]);
const REGULATIONS = () =>
  `<p>Please read these instructions carefully before joining the tour.</p>` +
  UL([
    'Arrive at the pickup point 15 minutes before departure',
    'Bring a valid ID; children must be accompanied by an adult',
    'Comfortable walking shoes and weather-appropriate clothing recommended',
    'Smoking and drinking alcohol on the vehicle are not allowed',
  ]);

const VIETNAM_TOURS: TourSeed[] = [
  {
    code: 'TOUR-0001',
    name: 'Ha Noi City Heritage Half Day',
    type: TourType.PRIVATE_TOUR,
    accent: { from: '#e74c3c', to: '#f39c12' },
    durationDays: 1,
    adultPrice: 49,
    childPrice: 25,
    infantPrice: 0,
    currency: 'USD',
    departureLocation: 'Hotel pickup — Old Quarter, Hanoi',
    transportation: 'AC private car + walking',
    mapQuery: 'Hoan Kiem Lake, Hanoi',
    overview:
      P(
        'Step into more than 1,000 years of Hanoi history on this private half-day walk through the city’s soul.',
      ) +
      UL([
        'Guided tour of the 36 ancient streets of the Old Quarter',
        'Hoan Kiem Lake, Ngoc Son Temple and the iconic red Huc Bridge',
        'Temple of Literature — Vietnam’s first national university',
        'Traditional water puppet show to close the day',
      ]),
    highlights: UL([
      'Private guide dedicated to your group only',
      'Skip the crowds with a carefully paced itinerary',
      'Local street-food recommendation list included',
      'All entrance fees covered',
    ]),
    includedServices: UL([
      'Private licensed guide',
      'All entrance tickets',
      'Bottled water',
      'Hotel pickup & drop-off in the Old Quarter',
    ]),
    excludedServices: UL([
      'Meals & beverages',
      'Personal expenses',
      'Gratuities (optional)',
    ]),
    regulations: REGULATIONS(),
    insurancePolicy: INSURANCE(),
    gallery: [
      { url: 'https://picsum.photos/seed/hanoi-1/1200/800' },
      { url: 'https://picsum.photos/seed/hanoi-2/1200/800' },
      { url: 'https://picsum.photos/seed/hanoi-3/1200/800' },
    ],
    itineraries: [
      {
        dayNumber: 1,
        orderIndex: 0,
        title: 'Pick-up & Old Quarter walking tour',
        description: `<p>Meet your <strong>private guide</strong> at the hotel lobby and wander through the 36 ancient streets of the Old Quarter.</p>${IMG('hanoi-oldquarter', 'Hanoi Old Quarter streets')}`,
        timeSlot: '08:00',
        location: 'Old Quarter, Hanoi',
      },
      {
        dayNumber: 1,
        orderIndex: 1,
        title: 'Hoan Kiem Lake & Ngoc Son Temple',
        description: `<p>Enjoy the red <em>Huc Bridge</em> and the legendary turtle tower in the heart of Hanoi.</p>${IMG('hanoi-hoan-kiem', 'Hoan Kiem Lake, Hanoi')}`,
        timeSlot: '09:30',
        location: 'Hoan Kiem Lake, Hanoi',
      },
      {
        dayNumber: 1,
        orderIndex: 2,
        title: 'Temple of Literature visit',
        description: `<p>Vietnam's first national university, a peaceful complex of courtyards and pavilions.</p>${IMG('hanoi-temple', 'Temple of Literature, Hanoi')}`,
        timeSlot: '11:00',
        location: 'Temple of Literature, Hanoi',
      },
      {
        dayNumber: 1,
        orderIndex: 3,
        title: 'Water puppet show & drop-off',
        description: `<p>Wrap up the day with a traditional <strong>water puppet show</strong> before returning to your hotel.</p>${IMG('water-puppet', 'Vietnamese water puppet show')}`,
        timeSlot: '15:00',
        location: 'Thang Long Theatre, Hanoi',
      },
    ],
  },
  {
    code: 'TOUR-0002',
    name: 'Ha Long Bay Full Day Cruise',
    type: TourType.GROUP_TOUR,
    accent: { from: '#0ea5e9', to: '#06b6d4' },
    durationDays: 1,
    adultPrice: 79,
    childPrice: 40,
    infantPrice: 10,
    currency: 'USD',
    departureLocation: 'Hotel pickup — Hanoi Old Quarter / Hoan Kiem',
    transportation: 'Air-conditioned shuttle bus + deluxe cruise',
    mapQuery: 'Tuan Chau Marina, Ha Long',
    overview:
      P(
        'Sail through thousands of limestone karsts on a full-day cruise around UNESCO-listed Ha Long Bay.',
      ) +
      UL([
        'Deluxe cruise with welcome drink and sun deck',
        'Sung Sot Cave and Ti Top Island',
        'Kayaking among the karsts',
        'Buffet lunch and sunset party on board',
      ]),
    highlights: UL([
      'Cave exploration at Sung Sot (Surprise Cave)',
      'Panoramic view from Ti Top Island',
      'Kayaking session included',
      'Full safety briefing before every activity',
    ]),
    includedServices: UL([
      'Hotel shuttle transfer',
      'Deluxe cruise with lunch',
      'All entrance fees',
      'Kayaking equipment',
      'English-speaking guide',
    ]),
    excludedServices: UL([
      'Personal expenses',
      'Drinks on board (pay locally)',
      'Gratuities',
    ]),
    regulations: REGULATIONS(),
    insurancePolicy: INSURANCE(),
    gallery: [
      { url: 'https://picsum.photos/seed/halong-1/1200/800' },
      { url: 'https://picsum.photos/seed/halong-2/1200/800' },
      { url: 'https://picsum.photos/seed/halong-3/1200/800' },
    ],
    itineraries: [
      {
        dayNumber: 1,
        orderIndex: 0,
        title: 'Depart Hanoi & board cruise',
        description: `<p>Shuttle bus picks you up from your hotel. Board the <strong>deluxe cruise</strong> and enjoy a welcome drink.</p>${IMG('halong-bay', 'Ha Long Bay cruise ship')}`,
        timeSlot: '08:00',
        location: 'Tuan Chau Marina, Ha Long',
      },
      {
        dayNumber: 1,
        orderIndex: 1,
        title: 'Sung Sot Cave (Surprise Cave)',
        description: `<p>Explore the largest and most magnificent cave in Ha Long Bay.</p>${IMG('halong-cave', 'Sung Sot Cave, Ha Long Bay')}`,
        timeSlot: '11:30',
        location: 'Sung Sot Cave, Ha Long Bay',
      },
      {
        dayNumber: 1,
        orderIndex: 2,
        title: 'Kayaking & Ti Top Island',
        description: `<p>Paddle through the limestone karsts, then climb Ti Top Island for a panoramic view.</p>${IMG('halong-kayak', 'Kayaking in Ha Long Bay')}`,
        timeSlot: '14:00',
        location: 'Ti Top Island, Ha Long Bay',
      },
      {
        dayNumber: 1,
        orderIndex: 3,
        title: 'Sunset party & return to Hanoi',
        description: `<p>Relax on the sundeck with fresh fruit and a sunset toast before the ride home.</p>${IMG('halong-sunset', 'Sunset over Ha Long Bay')}`,
        timeSlot: '17:30',
        location: 'Tuan Chau Marina, Ha Long',
      },
    ],
  },
  {
    code: 'TOUR-0003',
    name: 'Ninh Binh Countryside Day Trip',
    type: TourType.GROUP_TOUR,
    accent: { from: '#22c55e', to: '#16a34a' },
    durationDays: 2,
    adultPrice: 59,
    childPrice: 30,
    infantPrice: 0,
    currency: 'USD',
    departureLocation: 'Central pickup — No. 1 Ba Trieu Street, Hanoi',
    transportation: 'AC coach + rowing boat',
    mapQuery: 'Tam Coc, Ninh Binh',
    overview:
      P(
        'Two days through the ancient capital and the breathtaking waterways of the “Ha Long Bay on land”.',
      ) +
      UL([
        'Hoa Lu ancient capital and Trang An boat complex',
        'Tam Coc sampan ride through three caves',
        'Mua Cave viewpoint with 360° panorama',
        'Homestay-style overnight in the countryside',
      ]),
    highlights: UL([
      'Trang An — UNESCO World Heritage boat complex',
      '500 steps to the Mua Cave dragon viewpoint',
      'Bicycle ride through rice paddies',
      'Small group of max 12 travellers',
    ]),
    includedServices: UL([
      '2-day AC coach transfer',
      'Overnight accommodation',
      'All boat & entrance tickets',
      'Breakfast, lunch & dinner (Day 2 lunch)',
      'Bicycle rental',
    ]),
    excludedServices: UL(['Personal expenses', 'Drinks', 'Gratuities']),
    regulations: REGULATIONS(),
    insurancePolicy: INSURANCE(),
    gallery: [
      { url: 'https://picsum.photos/seed/ninhbinh-1/1200/800' },
      { url: 'https://picsum.photos/seed/ninhbinh-2/1200/800' },
      { url: 'https://picsum.photos/seed/ninhbinh-3/1200/800' },
    ],
    itineraries: [
      {
        dayNumber: 1,
        orderIndex: 0,
        title: 'Visit Hoa Lu ancient capital',
        description: `<p>Cycle through rice paddies and visit the temples of the Dinh and Le dynasties.</p>${IMG('ninhbinh-hoalu', 'Hoa Lu ancient capital')}`,
        timeSlot: '09:00',
        location: 'Hoa Lu, Ninh Binh',
      },
      {
        dayNumber: 1,
        orderIndex: 1,
        title: 'Tam Coc boat ride',
        description: `<p>Row through the <em>"Halong Bay on land"</em> with three limestone caves along the river.</p>${IMG('ninhbinh-tamcoc', 'Tam Coc boat ride, Ninh Binh')}`,
        timeSlot: '11:30',
        location: 'Tam Coc, Ninh Binh',
      },
      {
        dayNumber: 1,
        orderIndex: 2,
        title: 'Mua Cave viewpoint',
        description: `<p>Climb 500 stone steps for a stunning panorama of the Ngo Dong river valley.</p>${IMG('ninhbinh-muacave', 'Mua Cave viewpoint, Ninh Binh')}`,
        timeSlot: '15:00',
        location: 'Mua Cave, Ninh Binh',
      },
      {
        dayNumber: 2,
        orderIndex: 0,
        title: 'Trang An boat complex',
        description: `<p>Glide through the <strong>Trang An scenic landscape complex</strong>, a UNESCO World Heritage site of caves and temples.</p>${IMG('ninhbinh-trang-an', 'Trang An boat complex, Ninh Binh')}`,
        timeSlot: '08:30',
        location: 'Trang An, Ninh Binh',
      },
      {
        dayNumber: 2,
        orderIndex: 1,
        title: 'Bich Dong Pagoda',
        description: `<p>Climb the stone steps of the ancient pagoda set into a limestone mountain.</p>${IMG('ninhbinh-bichdong', 'Bich Dong Pagoda, Ninh Binh')}`,
        timeSlot: '11:00',
        location: 'Bich Dong Pagoda, Ninh Binh',
      },
      {
        dayNumber: 2,
        orderIndex: 2,
        title: 'Return to Hanoi',
        description:
          '<p>Lunch at a local restaurant before the afternoon drive back to Hanoi.</p>',
        timeSlot: '14:30',
        location: 'Ninh Binh city center',
      },
    ],
  },
  {
    code: 'TOUR-0004',
    name: 'Hoi An Ancient Town & Lantern Night',
    type: TourType.PRIVATE_TOUR,
    accent: { from: '#a855f7', to: '#ec4899' },
    durationDays: 1,
    adultPrice: 39,
    childPrice: 20,
    infantPrice: 0,
    currency: 'USD',
    departureLocation: 'Hotel pickup — Hoi An Old Town area',
    transportation: 'Walking tour + private car',
    mapQuery: 'Hoi An Ancient Town',
    overview:
      P(
        'Wander the lantern-lit streets of the 400-year-old UNESCO trading port of Hoi An.',
      ) +
      UL([
        'Japanese Covered Bridge and historic shophouses',
        'Hands-on silk lantern making workshop',
        'Night market and river lantern release',
      ]),
    highlights: UL([
      'Private evening tour when the town glows',
      'Make your own silk lantern to keep',
      'Sample local cao lầu noodles',
    ]),
    includedServices: UL([
      'Private guide',
      'Lantern workshop materials',
      'Entrance to Old Town attractions',
    ]),
    excludedServices: UL(['Dinner', 'Personal expenses', 'Gratuities']),
    regulations: REGULATIONS(),
    insurancePolicy: INSURANCE(),
    gallery: [
      { url: 'https://picsum.photos/seed/hoian-1/1200/800' },
      { url: 'https://picsum.photos/seed/hoian-2/1200/800' },
      { url: 'https://picsum.photos/seed/hoian-3/1200/800' },
    ],
    itineraries: [
      {
        dayNumber: 1,
        orderIndex: 0,
        title: 'Japanese Covered Bridge & Old Town',
        description: `<p>Discover the 400-year-old trading town and its iconic <strong>Japanese Bridge</strong>.</p>${IMG('hoian-bridge', 'Japanese Covered Bridge, Hoi An')}`,
        timeSlot: '16:00',
        location: 'Hoi An Ancient Town',
      },
      {
        dayNumber: 1,
        orderIndex: 1,
        title: 'Lantern making workshop',
        description: `<p>Make your own silk lantern at a local artisan's house.</p>${IMG('hoian-lantern', 'Lantern making workshop, Hoi An')}`,
        timeSlot: '18:00',
        location: 'Hoi An Old Town',
      },
      {
        dayNumber: 1,
        orderIndex: 2,
        title: 'Night market & river lantern release',
        description: `<p>Stroll the night market and release a lantern on the <em>Thu Bon river</em>.</p>${IMG('hoian-night', 'Hoi An night market by the river')}`,
        timeSlot: '19:30',
        location: 'Hoi An Night Market',
      },
    ],
  },
  {
    code: 'TOUR-0005',
    name: 'Da Nang & Ba Na Hills Golden Bridge',
    type: TourType.GROUP_TOUR,
    accent: { from: '#f59e0b', to: '#ef4444' },
    durationDays: 2,
    adultPrice: 69,
    childPrice: 35,
    infantPrice: 8,
    currency: 'USD',
    departureLocation: 'Hotel pickup — Da Nang city center',
    transportation: 'AC minivan + cable car',
    mapQuery: 'Golden Bridge, Ba Na Hills, Da Nang',
    overview:
      P(
        'Ride the world’s longest non-stop cable car to the French village and walk the famous Golden Bridge.',
      ) +
      UL([
        'Ba Na Hills cable car & French village',
        'Golden Bridge (Cau Vang) held by giant stone hands',
        'Marble Mountains & My Khe Beach',
        'Son Tra Peninsula & the Lady Buddha',
      ]),
    highlights: UL([
      'Golden Bridge photo at the “hands of God”',
      'Fantasy Park free-entrance zone',
      'Ocean views from Son Tra Peninsula',
      'Two full days with a professional guide',
    ]),
    includedServices: UL([
      'AC minivan transfers',
      'Ba Na Hills cable car tickets',
      'Accommodation (1 night)',
      'Breakfast',
      'English-speaking guide',
    ]),
    excludedServices: UL([
      'Lunches & dinners',
      'Personal expenses',
      'Gratuities',
    ]),
    regulations: REGULATIONS(),
    insurancePolicy: INSURANCE(),
    gallery: [
      { url: 'https://picsum.photos/seed/danang-1/1200/800' },
      { url: 'https://picsum.photos/seed/danang-2/1200/800' },
      { url: 'https://picsum.photos/seed/danang-3/1200/800' },
    ],
    itineraries: [
      {
        dayNumber: 1,
        orderIndex: 0,
        title: 'Cable car up Ba Na Hills',
        description: `<p>Ride the world's longest non-stop cable car to the French village.</p>${IMG('danang-cable', 'Ba Na Hills cable car')}`,
        timeSlot: '08:30',
        location: 'Ba Na Hills, Da Nang',
      },
      {
        dayNumber: 1,
        orderIndex: 1,
        title: 'Golden Bridge (Cau Vang)',
        description: `<p>Walk along the famous <strong>Golden Bridge</strong> held by giant stone hands.</p>${IMG('danang-goldenbridge', 'Golden Bridge, Ba Na Hills')}`,
        timeSlot: '10:00',
        location: 'Golden Bridge, Ba Na Hills',
      },
      {
        dayNumber: 1,
        orderIndex: 2,
        title: 'Marble Mountains & My Khe Beach',
        description: `<p>Explore the Five Marble Mountains, then relax on <em>My Khe</em> beach on the way back.</p>${IMG('danang-marble', 'Marble Mountains, Da Nang')}`,
        timeSlot: '14:00',
        location: 'Marble Mountains, Da Nang',
      },
      {
        dayNumber: 2,
        orderIndex: 0,
        title: 'Son Tra Peninsula & Linh Ung Pagoda',
        description: `<p>Drive up Monkey Mountain to the 67m-tall <strong>Linh Ung Pagoda</strong> and the Lady Buddha statue.</p>${IMG('danang-sontra', 'Linh Ung Pagoda, Son Tra Peninsula')}`,
        timeSlot: '08:00',
        location: 'Son Tra Peninsula, Da Nang',
      },
      {
        dayNumber: 2,
        orderIndex: 1,
        title: 'Dragon Bridge & Han River',
        description: `<p>See Da Nang's iconic <strong>Dragon Bridge</strong> and walk the Han riverfront promenade.</p>${IMG('danang-dragon-bridge', 'Dragon Bridge, Da Nang')}`,
        timeSlot: '11:00',
        location: 'Dragon Bridge, Da Nang',
      },
      {
        dayNumber: 2,
        orderIndex: 2,
        title: 'My Khe Beach free time',
        description: `<p>Swim or relax on the white sands of <em>My Khe Beach</em> before the airport drop-off.</p>${IMG('danang-mykhe', 'My Khe Beach, Da Nang')}`,
        timeSlot: '15:00',
        location: 'My Khe Beach, Da Nang',
      },
    ],
  },
  {
    code: 'TOUR-0006',
    name: 'Ho Chi Minh City & Cu Chi Tunnels',
    type: TourType.GROUP_TOUR,
    accent: { from: '#6366f1', to: '#8b5cf6' },
    durationDays: 3,
    adultPrice: 45,
    childPrice: 23,
    infantPrice: 0,
    currency: 'USD',
    itineraries: [
      {
        dayNumber: 1,
        orderIndex: 0,
        title: 'Cu Chi Tunnels morning tour',
        description: `<p>Crawl through the legendary underground tunnel network and try the local cassava snack.</p>${IMG('hcmc-cuchi', 'Cu Chi Tunnels, HCMC')}`,
        timeSlot: '08:00',
        location: 'Cu Chi Tunnels, HCMC',
      },
      {
        dayNumber: 1,
        orderIndex: 1,
        title: 'Ben Thanh Market & lunch',
        description: `<p>Sample street food and browse the historic <strong>Ben Thanh Market</strong>.</p>${IMG('hcmc-ben-thanh', 'Ben Thanh Market, HCMC')}`,
        timeSlot: '12:30',
        location: 'Ben Thanh Market, HCMC',
      },
      {
        dayNumber: 1,
        orderIndex: 2,
        title: 'Saigon landmarks walking tour',
        description: `<p>See Notre-Dame Cathedral, the Central Post Office and the Reunification Palace.</p>${IMG('hcmc-saigon', 'Notre-Dame Cathedral, HCMC')}`,
        timeSlot: '14:00',
        location: 'District 1, Ho Chi Minh City',
      },
      {
        dayNumber: 2,
        orderIndex: 0,
        title: 'Mekong Delta river cruise',
        description: `<p>Board a wooden boat in <strong>Ben Tre</strong> and cruise through coconut-fringed canals.</p>${IMG('mekong-bentre', 'Mekong Delta boat cruise, Ben Tre')}`,
        timeSlot: '08:00',
        location: 'Ben Tre, Mekong Delta',
      },
      {
        dayNumber: 2,
        orderIndex: 1,
        title: 'Coconut candy workshop & island lunch',
        description: `<p>Watch coconut candy being made on an island, then enjoy a riverside lunch.</p>${IMG('mekong-coconut', 'Coconut candy workshop, Mekong Delta')}`,
        timeSlot: '12:00',
        location: 'Ben Tre, Mekong Delta',
      },
      {
        dayNumber: 2,
        orderIndex: 2,
        title: 'Return to Saigon',
        description: `<p>Drive back to the city through the lush delta countryside.</p>${IMG('mekong', 'Mekong Delta countryside')}`,
        timeSlot: '16:00',
        location: 'Ho Chi Minh City',
      },
      {
        dayNumber: 3,
        orderIndex: 0,
        title: 'War Remnants Museum',
        description: `<p>A moving museum documenting the Vietnam War with photographs and military hardware.</p>${IMG('hcmc-war-museum', 'War Remnants Museum, HCMC')}`,
        timeSlot: '08:30',
        location: 'War Remnants Museum, HCMC',
      },
      {
        dayNumber: 3,
        orderIndex: 1,
        title: 'Chinatown & Binh Tay Market',
        description: `<p>Wander Cholon's narrow lanes and shop at the bustling <strong>Binh Tay Market</strong>.</p>${IMG('hcmc-chinatown', 'Binh Tay Market, Cholon HCMC')}`,
        timeSlot: '11:00',
        location: 'Binh Tay Market, Cholon HCMC',
      },
      {
        dayNumber: 3,
        orderIndex: 2,
        title: 'Departure transfer / free time',
        description: `<p>Last-minute shopping in District 1 before your airport transfer.</p>${IMG('hcmc-airport', 'Tan Son Nhat Airport, HCMC')}`,
        timeSlot: '14:00',
        location: 'Tan Son Nhat Airport, HCMC',
      },
    ],
  },
];

async function main() {
  /** Write the full permission set of a role, instead of only setting it at creation time. */
  async function syncRolePermissions(roleId: string, codes: string[]) {
    const ids = codes
      .map((code) => permissionMap.get(code))
      .filter((id): id is string => Boolean(id));
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    if (ids.length) {
      await prisma.rolePermission.createMany({
        data: ids.map((permissionId) => ({ roleId, permissionId })),
      });
    }
  }

  // 1. Permissions
  const permissionMap = new Map<string, string>();
  for (const p of DEFAULT_PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, group: p.group },
      create: p,
    });
    permissionMap.set(p.code, created.id);
  }
  console.log(`✅ Seeded ${DEFAULT_PERMISSIONS.length} permissions`);

  // 1b. Default settlement categories
  for (const c of DEFAULT_SETTLEMENT_CATEGORIES) {
    await prisma.settlementCategory.upsert({
      where: { code: c.code },
      update: { name: c.name, flowType: c.flowType },
      create: {
        code: c.code,
        name: c.name,
        flowType: c.flowType,
        isSystem: true,
      },
    });
  }
  console.log(
    `✅ Seeded ${DEFAULT_SETTLEMENT_CATEGORIES.length} settlement categories`,
  );

  // 2. ADMIN system role (grants every permission)
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System administrator',
      isSystem: true,
    },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: [...permissionMap.values()].map((permissionId) => ({
      roleId: adminRole.id,
      permissionId,
    })),
  });
  console.log(
    `✅ Seeded ADMIN system role (${permissionMap.size} permissions)`,
  );

  // 3. OFFICE role (basic) — has NO money permissions.
  const officeRole = await prisma.role.upsert({
    where: { name: 'OFFICE' },
    update: {},
    create: {
      name: 'OFFICE',
      description: 'Nhân viên văn phòng',
      isSystem: false,
    },
  });
  await syncRolePermissions(officeRole.id, [
    'dashboard.read',
    'booking.read',
    'booking.create',
    'booking.update',
    'assignment.read',
    'assignment.create',
    'assignment.update',
    'company.read',
    'tour.update',
    'tour.itinerary.edit',
  ]);
  console.log(`✅ Seeded OFFICE role`);

  // 3.1 TOUR_GUIDE role — only the tasks of a trip creator.
  //
  // Deliberately does NOT grant `assignment.update`: that permission also opens
  // dispatch-all and PUT /assignments/:id, i.e. a guide could swap the guide/driver on the board.
  // Also not granted `booking.read` because GET /bookings returns every passenger of the company.
  // Guides see their own trips via /assignments/my-assignments (already self-limited).
  const guideRole = await prisma.role.upsert({
    where: { name: 'TOUR_GUIDE' },
    update: {},
    create: {
      name: 'TOUR_GUIDE',
      description:
        'Hướng dẫn viên — nộp báo cáo, ghi chú và thu/hoàn tiền của chuyến mình',
      isSystem: true,
    },
  });
  await syncRolePermissions(guideRole.id, [
    'assignment.tour-report.submit',
    'booking.note.update',
  ]);
  console.log(`✅ Seeded TOUR_GUIDE role`);

  // 3.2 ACCOUNTING role — Accounting Room. Assigned to specific OFFICE users,
  // not to the whole office (money-lock & period-export permissions).
  const accountingRole = await prisma.role.upsert({
    where: { name: 'ACCOUNTING' },
    update: {},
    create: {
      name: 'ACCOUNTING',
      description: 'Phòng kế toán — kiểm tra, khoá tiền, xuất kỳ thanh toán',
      isSystem: false,
    },
  });
  await syncRolePermissions(accountingRole.id, [
    'accounting.read',
    'accounting.settlement.create',
    'accounting.settlement.update',
    'accounting.settlement.delete',
    'accounting.category.create',
    'accounting.money.verify',
    'accounting.money.reject',
    'accounting.period.export',
    'accounting.period.void',
  ]);
  console.log(`✅ Seeded ACCOUNTING role`);

  // 3.5 TRANSPORT_PROVIDER role — self-manages its own transport provider
  // (cannot see company users/data — every query must be scoped by providerId).
  const providerRole = await prisma.role.upsert({
    where: { name: 'TRANSPORT_PROVIDER' },
    update: {},
    create: {
      name: 'TRANSPORT_PROVIDER',
      description: 'Đối tác vận chuyển — quản lý xe & tài xế của chính nhà xe',
      isSystem: false,
    },
  });
  await prisma.rolePermission.deleteMany({
    where: { roleId: providerRole.id },
  });
  const PROVIDER_ROLE_PERMISSIONS = [
    'assignment.read',
    'assignment.create',
    'vehicle.create',
    'vehicle.update',
    'vehicle.delete',
    'driver.create',
    'driver.update',
    'provider-driver.assign',
    'provider-driver.unassign',
    'route-price.create',
    'route-price.update',
  ];
  await prisma.rolePermission.createMany({
    data: PROVIDER_ROLE_PERMISSIONS.filter((code) =>
      permissionMap.has(code),
    ).map((code) => ({
      roleId: providerRole.id,
      permissionId: permissionMap.get(code)!,
    })),
  });
  console.log(
    `✅ Seeded TRANSPORT_PROVIDER role (${PROVIDER_ROLE_PERMISSIONS.filter((c) => permissionMap.has(c)).length} permissions)`,
  );

  // 4. Default admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@booking.local';
  const passwordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD || 'admin123',
    10,
  );
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'System Admin',
      passwordHash,
      authProvider: AuthProvider.LOCAL,
      role: RoleType.ADMIN,
      userType: 'admin',
    },
  });
  // Assign the ADMIN role to the admin user
  const hasAdminRole = await prisma.userRole.findFirst({
    where: { userId: adminUser.id, roleId: adminRole.id },
  });
  if (!hasAdminRole) {
    await prisma.userRole.create({
      data: { userId: adminUser.id, roleId: adminRole.id },
    });
  }
  console.log(`✅ Seeded admin user: ${adminEmail} (password: admin123)`);

  // 4.5 Company profile (singleton table — only 1 row for the settlement slip)
  await prisma.companyProfile.upsert({
    where: { id: 'default-company' },
    update: {},
    create: {
      id: 'default-company',
      name: 'SunShine Travel & Transportation Co., Ltd.',
      address: '88 Bach Dang Street, Hai Chau District, Da Nang, Vietnam',
      phone: '+84 236 3888 999',
      email: 'hello@sunshine-travel.vn',
      taxId: '0317412086',
      website: 'https://sunshine-travel.vn',
      rootLatitude: 10.76557640959363,
      rootLongitude: 106.70411045421818,
    },
  });
  console.log(`✅ Seeded company profile`);

  // 5. Vietnam tours with structured itineraries (idempotent by code)
  for (const t of VIETNAM_TOURS) {
    const tour = await prisma.tour.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        type: t.type,
        adultPrice: t.adultPrice,
        childPrice: t.childPrice,
        infantPrice: t.infantPrice,
        currency: t.currency,
        durationDays: t.durationDays,
        departureLocation: t.departureLocation ?? null,
        transportation: t.transportation ?? null,
        overview: t.overview ?? null,
        highlights: t.highlights ?? null,
        includedServices: t.includedServices ?? null,
        excludedServices: t.excludedServices ?? null,
        regulations: t.regulations ?? null,
        insurancePolicy: t.insurancePolicy ?? null,
        mapQuery: t.mapQuery ?? null,
      },
      create: {
        code: t.code,
        name: t.name,
        type: t.type,
        adultPrice: t.adultPrice,
        childPrice: t.childPrice,
        infantPrice: t.infantPrice,
        currency: t.currency,
        durationDays: t.durationDays,
        departureLocation: t.departureLocation ?? null,
        transportation: t.transportation ?? null,
        overview: t.overview ?? null,
        highlights: t.highlights ?? null,
        includedServices: t.includedServices ?? null,
        excludedServices: t.excludedServices ?? null,
        regulations: t.regulations ?? null,
        insurancePolicy: t.insurancePolicy ?? null,
        mapQuery: t.mapQuery ?? null,
      },
    });

    const thumbnailUrl = await seedThumbnail(tour.id, t.code, t.name, t.accent);
    await prisma.tour.update({
      where: { id: tour.id },
      data: { thumbnailUrl },
    });

    await prisma.tourItinerary.deleteMany({ where: { tourId: tour.id } });
    if (t.itineraries.length > 0) {
      await prisma.tourItinerary.createMany({
        data: t.itineraries.map((it) => ({ ...it, tourId: tour.id })),
      });
    }
    await prisma.tourGallery.deleteMany({ where: { tourId: tour.id } });
    await seedGalleryImages(tour.id, t.code);
    console.log(`✅ Seeded tour ${t.code} — ${t.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
