import 'dotenv/config';
import { PrismaClient, AuthProvider, RoleType, TourType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';

const prisma = new PrismaClient();

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');
const GALLERY_SHOTS = 3;

/**
 * Folder-based gallery: ghi các ảnh placeholder cục bộ vào thư mục ảnh của tour
 * (uploads/tours/{tourId}/gallery). Không cần bản ghi DB — frontend đọc thẳng folder.
 */
async function seedGalleryImages(tourId: string, code: string, count = GALLERY_SHOTS) {
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
    const file = path.join(folder, `${String(i).padStart(3, '0')}-seed-${i}.webp`);
    await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(file);
  }
}

const DEFAULT_PERMISSIONS: Array<{ code: string; name: string; group: string }> = [
  { code: 'dashboard.read', name: 'Xem dashboard', group: 'Dashboard' },
  { code: 'booking.read', name: 'Xem booking', group: 'Booking' },
  { code: 'booking.create', name: 'Tạo booking', group: 'Booking' },
  { code: 'booking.update', name: 'Sửa booking', group: 'Booking' },
  { code: 'booking.delete', name: 'Xoá booking', group: 'Booking' },
  { code: 'assignment.read', name: 'Xem assignment', group: 'Assignment' },
  { code: 'assignment.create', name: 'Tạo assignment', group: 'Assignment' },
  { code: 'assignment.update', name: 'Sửa assignment', group: 'Assignment' },
  { code: 'assignment.delete', name: 'Xoá assignment', group: 'Assignment' },
  { code: 'settlement.read', name: 'Xem settlement', group: 'Settlement' },
  { code: 'settlement.create', name: 'Tạo settlement', group: 'Settlement' },
  { code: 'settlement.update', name: 'Sửa settlement', group: 'Settlement' },
  { code: 'settlement.approve', name: 'Duyệt settlement', group: 'Settlement' },
  { code: 'settlement.delete', name: 'Xoá settlement', group: 'Settlement' },
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
];

interface TourSeed {
  code: string;
  name: string;
  type: TourType;
  thumbnailUrl?: string;
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

const UL = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
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
    thumbnailUrl: 'https://picsum.photos/seed/hanoi-oldquarter/800/600',
    type: TourType.PRIVATE_TOUR,
    durationDays: 1,
    adultPrice: 49,
    childPrice: 25,
    infantPrice: 0,
    currency: 'USD',
    departureLocation: 'Hotel pickup — Old Quarter, Hanoi',
    transportation: 'AC private car + walking',
    mapQuery: 'Hoan Kiem Lake, Hanoi',
    overview:
      P('Step into more than 1,000 years of Hanoi history on this private half-day walk through the city’s soul.') +
      UL([
        'Guided tour of the 36 ancient streets of the Old Quarter',
        'Hoan Kiem Lake, Ngoc Son Temple and the iconic red Huc Bridge',
        'Temple of Literature — Vietnam’s first national university',
        'Traditional water puppet show to close the day',
      ]),
    highlights:
      UL([
        'Private guide dedicated to your group only',
        'Skip the crowds with a carefully paced itinerary',
        'Local street-food recommendation list included',
        'All entrance fees covered',
      ]),
    includedServices:
      UL(['Private licensed guide', 'All entrance tickets', 'Bottled water', 'Hotel pickup & drop-off in the Old Quarter']),
    excludedServices:
      UL(['Meals & beverages', 'Personal expenses', 'Gratuities (optional)']),
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
        description:
          `<p>Meet your <strong>private guide</strong> at the hotel lobby and wander through the 36 ancient streets of the Old Quarter.</p>${IMG('hanoi-oldquarter', 'Hanoi Old Quarter streets')}`,
        timeSlot: '08:00',
        location: 'Old Quarter, Hanoi',
      },
      {
        dayNumber: 1,
        orderIndex: 1,
        title: 'Hoan Kiem Lake & Ngoc Son Temple',
        description:
          `<p>Enjoy the red <em>Huc Bridge</em> and the legendary turtle tower in the heart of Hanoi.</p>${IMG('hanoi-hoan-kiem', 'Hoan Kiem Lake, Hanoi')}`,
        timeSlot: '09:30',
        location: 'Hoan Kiem Lake, Hanoi',
      },
      {
        dayNumber: 1,
        orderIndex: 2,
        title: 'Temple of Literature visit',
        description:
          `<p>Vietnam's first national university, a peaceful complex of courtyards and pavilions.</p>${IMG('hanoi-temple', 'Temple of Literature, Hanoi')}`,
        timeSlot: '11:00',
        location: 'Temple of Literature, Hanoi',
      },
      {
        dayNumber: 1,
        orderIndex: 3,
        title: 'Water puppet show & drop-off',
        description:
          `<p>Wrap up the day with a traditional <strong>water puppet show</strong> before returning to your hotel.</p>${IMG('water-puppet', 'Vietnamese water puppet show')}`,
        timeSlot: '15:00',
        location: 'Thang Long Theatre, Hanoi',
      },
    ],
  },
  {
    code: 'TOUR-0002',
    name: 'Ha Long Bay Full Day Cruise',
    thumbnailUrl: 'https://picsum.photos/seed/halong-bay/800/600',
    type: TourType.GROUP_TOUR,
    durationDays: 1,
    adultPrice: 79,
    childPrice: 40,
    infantPrice: 10,
    currency: 'USD',
    departureLocation: 'Hotel pickup — Hanoi Old Quarter / Hoan Kiem',
    transportation: 'Air-conditioned shuttle bus + deluxe cruise',
    mapQuery: 'Tuan Chau Marina, Ha Long',
    overview:
      P('Sail through thousands of limestone karsts on a full-day cruise around UNESCO-listed Ha Long Bay.') +
      UL([
        'Deluxe cruise with welcome drink and sun deck',
        'Sung Sot Cave and Ti Top Island',
        'Kayaking among the karsts',
        'Buffet lunch and sunset party on board',
      ]),
    highlights:
      UL([
        'Cave exploration at Sung Sot (Surprise Cave)',
        'Panoramic view from Ti Top Island',
        'Kayaking session included',
        'Full safety briefing before every activity',
      ]),
    includedServices:
      UL(['Hotel shuttle transfer', 'Deluxe cruise with lunch', 'All entrance fees', 'Kayaking equipment', 'English-speaking guide']),
    excludedServices:
      UL(['Personal expenses', 'Drinks on board (pay locally)', 'Gratuities']),
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
        description:
          `<p>Shuttle bus picks you up from your hotel. Board the <strong>deluxe cruise</strong> and enjoy a welcome drink.</p>${IMG('halong-bay', 'Ha Long Bay cruise ship')}`,
        timeSlot: '08:00',
        location: 'Tuan Chau Marina, Ha Long',
      },
      {
        dayNumber: 1,
        orderIndex: 1,
        title: 'Sung Sot Cave (Surprise Cave)',
        description:
          `<p>Explore the largest and most magnificent cave in Ha Long Bay.</p>${IMG('halong-cave', 'Sung Sot Cave, Ha Long Bay')}`,
        timeSlot: '11:30',
        location: 'Sung Sot Cave, Ha Long Bay',
      },
      {
        dayNumber: 1,
        orderIndex: 2,
        title: 'Kayaking & Ti Top Island',
        description:
          `<p>Paddle through the limestone karsts, then climb Ti Top Island for a panoramic view.</p>${IMG('halong-kayak', 'Kayaking in Ha Long Bay')}`,
        timeSlot: '14:00',
        location: 'Ti Top Island, Ha Long Bay',
      },
      {
        dayNumber: 1,
        orderIndex: 3,
        title: 'Sunset party & return to Hanoi',
        description:
          `<p>Relax on the sundeck with fresh fruit and a sunset toast before the ride home.</p>${IMG('halong-sunset', 'Sunset over Ha Long Bay')}`,
        timeSlot: '17:30',
        location: 'Tuan Chau Marina, Ha Long',
      },
    ],
  },
  {
    code: 'TOUR-0003',
    name: 'Ninh Binh Countryside Day Trip',
    thumbnailUrl: 'https://picsum.photos/seed/ninhbinh-tamcoc/800/600',
    type: TourType.GROUP_TOUR,
    durationDays: 2,
    adultPrice: 59,
    childPrice: 30,
    infantPrice: 0,
    currency: 'USD',
    departureLocation: 'Central pickup — No. 1 Ba Trieu Street, Hanoi',
    transportation: 'AC coach + rowing boat',
    mapQuery: 'Tam Coc, Ninh Binh',
    overview:
      P('Two days through the ancient capital and the breathtaking waterways of the “Ha Long Bay on land”.') +
      UL([
        'Hoa Lu ancient capital and Trang An boat complex',
        'Tam Coc sampan ride through three caves',
        'Mua Cave viewpoint with 360° panorama',
        'Homestay-style overnight in the countryside',
      ]),
    highlights:
      UL([
        'Trang An — UNESCO World Heritage boat complex',
        '500 steps to the Mua Cave dragon viewpoint',
        'Bicycle ride through rice paddies',
        'Small group of max 12 travellers',
      ]),
    includedServices:
      UL(['2-day AC coach transfer', 'Overnight accommodation', 'All boat & entrance tickets', 'Breakfast, lunch & dinner (Day 2 lunch)', 'Bicycle rental']),
    excludedServices:
      UL(['Personal expenses', 'Drinks', 'Gratuities']),
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
        description:
          `<p>Cycle through rice paddies and visit the temples of the Dinh and Le dynasties.</p>${IMG('ninhbinh-hoalu', 'Hoa Lu ancient capital')}`,
        timeSlot: '09:00',
        location: 'Hoa Lu, Ninh Binh',
      },
      {
        dayNumber: 1,
        orderIndex: 1,
        title: 'Tam Coc boat ride',
        description:
          `<p>Row through the <em>"Halong Bay on land"</em> with three limestone caves along the river.</p>${IMG('ninhbinh-tamcoc', 'Tam Coc boat ride, Ninh Binh')}`,
        timeSlot: '11:30',
        location: 'Tam Coc, Ninh Binh',
      },
      {
        dayNumber: 1,
        orderIndex: 2,
        title: 'Mua Cave viewpoint',
        description:
          `<p>Climb 500 stone steps for a stunning panorama of the Ngo Dong river valley.</p>${IMG('ninhbinh-muacave', 'Mua Cave viewpoint, Ninh Binh')}`,
        timeSlot: '15:00',
        location: 'Mua Cave, Ninh Binh',
      },
      {
        dayNumber: 2,
        orderIndex: 0,
        title: 'Trang An boat complex',
        description:
          `<p>Glide through the <strong>Trang An scenic landscape complex</strong>, a UNESCO World Heritage site of caves and temples.</p>${IMG('ninhbinh-trang-an', 'Trang An boat complex, Ninh Binh')}`,
        timeSlot: '08:30',
        location: 'Trang An, Ninh Binh',
      },
      {
        dayNumber: 2,
        orderIndex: 1,
        title: 'Bich Dong Pagoda',
        description:
          `<p>Climb the stone steps of the ancient pagoda set into a limestone mountain.</p>${IMG('ninhbinh-bichdong', 'Bich Dong Pagoda, Ninh Binh')}`,
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
    thumbnailUrl: 'https://picsum.photos/seed/hoian-lantern/800/600',
    type: TourType.PRIVATE_TOUR,
    durationDays: 1,
    adultPrice: 39,
    childPrice: 20,
    infantPrice: 0,
    currency: 'USD',
    departureLocation: 'Hotel pickup — Hoi An Old Town area',
    transportation: 'Walking tour + private car',
    mapQuery: 'Hoi An Ancient Town',
    overview:
      P('Wander the lantern-lit streets of the 400-year-old UNESCO trading port of Hoi An.') +
      UL([
        'Japanese Covered Bridge and historic shophouses',
        'Hands-on silk lantern making workshop',
        'Night market and river lantern release',
      ]),
    highlights:
      UL([
        'Private evening tour when the town glows',
        'Make your own silk lantern to keep',
        'Sample local cao lầu noodles',
      ]),
    includedServices:
      UL(['Private guide', 'Lantern workshop materials', 'Entrance to Old Town attractions']),
    excludedServices:
      UL(['Dinner', 'Personal expenses', 'Gratuities']),
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
        description:
          `<p>Discover the 400-year-old trading town and its iconic <strong>Japanese Bridge</strong>.</p>${IMG('hoian-bridge', 'Japanese Covered Bridge, Hoi An')}`,
        timeSlot: '16:00',
        location: 'Hoi An Ancient Town',
      },
      {
        dayNumber: 1,
        orderIndex: 1,
        title: 'Lantern making workshop',
        description:
          `<p>Make your own silk lantern at a local artisan's house.</p>${IMG('hoian-lantern', 'Lantern making workshop, Hoi An')}`,
        timeSlot: '18:00',
        location: 'Hoi An Old Town',
      },
      {
        dayNumber: 1,
        orderIndex: 2,
        title: 'Night market & river lantern release',
        description:
          `<p>Stroll the night market and release a lantern on the <em>Thu Bon river</em>.</p>${IMG('hoian-night', 'Hoi An night market by the river')}`,
        timeSlot: '19:30',
        location: 'Hoi An Night Market',
      },
    ],
  },
  {
    code: 'TOUR-0005',
    name: 'Da Nang & Ba Na Hills Golden Bridge',
    thumbnailUrl: 'https://picsum.photos/seed/danang-goldenbridge/800/600',
    type: TourType.GROUP_TOUR,
    durationDays: 2,
    adultPrice: 69,
    childPrice: 35,
    infantPrice: 8,
    currency: 'USD',
    departureLocation: 'Hotel pickup — Da Nang city center',
    transportation: 'AC minivan + cable car',
    mapQuery: 'Golden Bridge, Ba Na Hills, Da Nang',
    overview:
      P('Ride the world’s longest non-stop cable car to the French village and walk the famous Golden Bridge.') +
      UL([
        'Ba Na Hills cable car & French village',
        'Golden Bridge (Cau Vang) held by giant stone hands',
        'Marble Mountains & My Khe Beach',
        'Son Tra Peninsula & the Lady Buddha',
      ]),
    highlights:
      UL([
        'Golden Bridge photo at the “hands of God”',
        'Fantasy Park free-entrance zone',
        'Ocean views from Son Tra Peninsula',
        'Two full days with a professional guide',
      ]),
    includedServices:
      UL(['AC minivan transfers', 'Ba Na Hills cable car tickets', 'Accommodation (1 night)', 'Breakfast', 'English-speaking guide']),
    excludedServices:
      UL(['Lunches & dinners', 'Personal expenses', 'Gratuities']),
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
        description:
          `<p>Ride the world's longest non-stop cable car to the French village.</p>${IMG('danang-cable', 'Ba Na Hills cable car')}`,
        timeSlot: '08:30',
        location: 'Ba Na Hills, Da Nang',
      },
      {
        dayNumber: 1,
        orderIndex: 1,
        title: 'Golden Bridge (Cau Vang)',
        description:
          `<p>Walk along the famous <strong>Golden Bridge</strong> held by giant stone hands.</p>${IMG('danang-goldenbridge', 'Golden Bridge, Ba Na Hills')}`,
        timeSlot: '10:00',
        location: 'Golden Bridge, Ba Na Hills',
      },
      {
        dayNumber: 1,
        orderIndex: 2,
        title: 'Marble Mountains & My Khe Beach',
        description:
          `<p>Explore the Five Marble Mountains, then relax on <em>My Khe</em> beach on the way back.</p>${IMG('danang-marble', 'Marble Mountains, Da Nang')}`,
        timeSlot: '14:00',
        location: 'Marble Mountains, Da Nang',
      },
      {
        dayNumber: 2,
        orderIndex: 0,
        title: 'Son Tra Peninsula & Linh Ung Pagoda',
        description:
          `<p>Drive up Monkey Mountain to the 67m-tall <strong>Linh Ung Pagoda</strong> and the Lady Buddha statue.</p>${IMG('danang-sontra', 'Linh Ung Pagoda, Son Tra Peninsula')}`,
        timeSlot: '08:00',
        location: 'Son Tra Peninsula, Da Nang',
      },
      {
        dayNumber: 2,
        orderIndex: 1,
        title: 'Dragon Bridge & Han River',
        description:
          `<p>See Da Nang's iconic <strong>Dragon Bridge</strong> and walk the Han riverfront promenade.</p>${IMG('danang-dragon-bridge', 'Dragon Bridge, Da Nang')}`,
        timeSlot: '11:00',
        location: 'Dragon Bridge, Da Nang',
      },
      {
        dayNumber: 2,
        orderIndex: 2,
        title: 'My Khe Beach free time',
        description:
          `<p>Swim or relax on the white sands of <em>My Khe Beach</em> before the airport drop-off.</p>${IMG('danang-mykhe', 'My Khe Beach, Da Nang')}`,
        timeSlot: '15:00',
        location: 'My Khe Beach, Da Nang',
      },
    ],
  },
  {
    code: 'TOUR-0006',
    name: 'Ho Chi Minh City & Cu Chi Tunnels',
    thumbnailUrl: 'https://picsum.photos/seed/hcmc-cuchi/800/600',
    type: TourType.GROUP_TOUR,
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
        description:
          `<p>Crawl through the legendary underground tunnel network and try the local cassava snack.</p>${IMG('hcmc-cuchi', 'Cu Chi Tunnels, HCMC')}`,
        timeSlot: '08:00',
        location: 'Cu Chi Tunnels, HCMC',
      },
      {
        dayNumber: 1,
        orderIndex: 1,
        title: 'Ben Thanh Market & lunch',
        description:
          `<p>Sample street food and browse the historic <strong>Ben Thanh Market</strong>.</p>${IMG('hcmc-ben-thanh', 'Ben Thanh Market, HCMC')}`,
        timeSlot: '12:30',
        location: 'Ben Thanh Market, HCMC',
      },
      {
        dayNumber: 1,
        orderIndex: 2,
        title: 'Saigon landmarks walking tour',
        description:
          `<p>See Notre-Dame Cathedral, the Central Post Office and the Reunification Palace.</p>${IMG('hcmc-saigon', 'Notre-Dame Cathedral, HCMC')}`,
        timeSlot: '14:00',
        location: 'District 1, Ho Chi Minh City',
      },
      {
        dayNumber: 2,
        orderIndex: 0,
        title: 'Mekong Delta river cruise',
        description:
          `<p>Board a wooden boat in <strong>Ben Tre</strong> and cruise through coconut-fringed canals.</p>${IMG('mekong-bentre', 'Mekong Delta boat cruise, Ben Tre')}`,
        timeSlot: '08:00',
        location: 'Ben Tre, Mekong Delta',
      },
      {
        dayNumber: 2,
        orderIndex: 1,
        title: 'Coconut candy workshop & island lunch',
        description:
          `<p>Watch coconut candy being made on an island, then enjoy a riverside lunch.</p>${IMG('mekong-coconut', 'Coconut candy workshop, Mekong Delta')}`,
        timeSlot: '12:00',
        location: 'Ben Tre, Mekong Delta',
      },
      {
        dayNumber: 2,
        orderIndex: 2,
        title: 'Return to Saigon',
        description:
          `<p>Drive back to the city through the lush delta countryside.</p>${IMG('mekong', 'Mekong Delta countryside')}`,
        timeSlot: '16:00',
        location: 'Ho Chi Minh City',
      },
      {
        dayNumber: 3,
        orderIndex: 0,
        title: 'War Remnants Museum',
        description:
          `<p>A moving museum documenting the Vietnam War with photographs and military hardware.</p>${IMG('hcmc-war-museum', 'War Remnants Museum, HCMC')}`,
        timeSlot: '08:30',
        location: 'War Remnants Museum, HCMC',
      },
      {
        dayNumber: 3,
        orderIndex: 1,
        title: 'Chinatown & Binh Tay Market',
        description:
          `<p>Wander Cholon's narrow lanes and shop at the bustling <strong>Binh Tay Market</strong>.</p>${IMG('hcmc-chinatown', 'Binh Tay Market, Cholon HCMC')}`,
        timeSlot: '11:00',
        location: 'Binh Tay Market, Cholon HCMC',
      },
      {
        dayNumber: 3,
        orderIndex: 2,
        title: 'Departure transfer / free time',
        description:
          `<p>Last-minute shopping in District 1 before your airport transfer.</p>${IMG('hcmc-airport', 'Tan Son Nhat Airport, HCMC')}`,
        timeSlot: '14:00',
        location: 'Tan Son Nhat Airport, HCMC',
      },
    ],
  },
];

async function main() {
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

  // 2. ADMIN system role (gắn mọi permission)
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'System administrator', isSystem: true },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: [...permissionMap.values()].map((permissionId) => ({
      roleId: adminRole.id,
      permissionId,
    })),
  });
  console.log(`✅ Seeded ADMIN system role (${permissionMap.size} permissions)`);

  // 3. OFFICE role (cơ bản)
  await prisma.role.upsert({
    where: { name: 'OFFICE' },
    update: {},
    create: {
      name: 'OFFICE',
      description: 'Nhân viên văn phòng',
      isSystem: false,
      permissions: {
        create: [
          'dashboard.read',
          'booking.read',
          'booking.create',
          'booking.update',
          'assignment.read',
          'assignment.create',
          'assignment.update',
          'settlement.read',
          'tour.update',
          'tour.itinerary.edit',
        ]
          .filter((code) => permissionMap.has(code))
          .map((code) => ({ permissionId: permissionMap.get(code)! })),
      },
    },
  });
  console.log(`✅ Seeded OFFICE role`);

  // 4. Admin user mặc định
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@booking.local';
  const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'admin123', 10);
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
  // Gắn role ADMIN cho admin user
  const hasAdminRole = await prisma.userRole.findFirst({
    where: { userId: adminUser.id, roleId: adminRole.id },
  });
  if (!hasAdminRole) {
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });
  }
  console.log(`✅ Seeded admin user: ${adminEmail} (password: admin123)`);

  // 5. Vietnam tours with structured itineraries (idempotent by code)
  for (const t of VIETNAM_TOURS) {
    const tour = await prisma.tour.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        type: t.type,
        thumbnailUrl: t.thumbnailUrl ?? null,
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
        thumbnailUrl: t.thumbnailUrl ?? null,
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

main()  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
