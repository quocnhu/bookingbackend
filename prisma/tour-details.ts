import type { TourType } from '@prisma/client';

export type TourDetailSeed = {
  adultPrice: number;
  childPrice: number;
  infantPrice: number;
  currency: string;
  cancellationPolicy: string;
  departureLocation: string;
  transportation: string;
  overview: string;
  includedServices: string;
  excludedServices: string;
  childrenPolicy: string;
  regulations: string;
  highlights: string;
  insurancePolicy: string;
  mapQuery: string;
  typePrices: Array<{
    type: TourType;
    adultPrice: number;
    childPrice: number;
    infantPrice: number;
    currency: string;
  }>;
  itineraries: Array<{
    dayNumber: number;
    orderIndex: number;
    title: string;
    description: string;
    timeSlot: string;
    location: string;
    imageUrl: string | null;
    mapQuery: string;
  }>;
};

type Stop = [time: string, title: string, location: string, description: string, map?: string];
type DayPlan = { day?: number; stops: Stop[] };

type DetailInput = {
  groupAdult: number;
  privateAdult: number;
  childRatio?: number;
  departureLocation?: string;
  transportation: string;
  mapQuery: string;
  overview: string[];
  highlights: string[];
  included: string[];
  excluded?: string[];
  baseServices?: boolean;
  itinerary: DayPlan[];
};

const DEFAULT_PICKUP =
  'Free hotel pickup in District 1, District 3 and District 4, Ho Chi Minh City. Meet at the SunShine Travel office, 17 Ton Duc Thang Street, District 1, if your hotel is outside the pickup area.';

const BASE_INCLUDED = [
  'Air-conditioned transportation and boat rides as mentioned in the itinerary',
  'English-speaking local guide with deep knowledge of the region',
  'All entrance fees, sightseeing tickets and boat tickets listed in the program',
  'Bottled water (two bottles per person per day)',
  'Meals as clearly stated in the itinerary',
];

const BASE_EXCLUDED = [
  'Personal expenses, souvenirs and additional drinks',
  'Travel insurance and personal medical expenses',
  'Gratuities for the guide and driver (optional)',
  'Optional activities that are not listed in the itinerary',
];

const CHILDREN_POLICY =
  '<ul><li>Infants under 2 years old travel free of charge when sharing with two adults.</li><li>Children from 2 to 4 years old are charged 50% of the adult price.</li><li>Children from 5 to 10 years old are charged 70% of the adult price.</li><li>Children from 11 years old are charged the full adult price.</li><li>One adult may accompany a maximum of two children. Please confirm child ages when booking.</li></ul>';

const REGULATIONS =
  '<ul><li>Please be ready in the hotel lobby 10 minutes before the confirmed pickup time.</li><li>Wear comfortable walking shoes and light clothing. Bring a hat, sunscreen, insect repellent and a raincoat in the rainy season.</li><li>Do not bring valuable jewellery or large amounts of cash on boat trips and walking tours.</li><li>The guide may adjust the order of stops to avoid traffic, bad weather or overcrowding while keeping all included experiences.</li><li>Please advise us of food allergies, mobility needs or special requests at least 24 hours before departure.</li></ul>';

const INSURANCE_POLICY =
  '<p>Every guest is covered by basic travel insurance during the tour, including emergency assistance and medical support within the scope of the policy. The insurance does not cover pre-existing conditions, personal belongings, adventure activities outside the program, or losses caused by the guest&apos;s own negligence.</p><p>Please provide your full name, passport number and date of birth when booking so the insurance certificate can be issued. Guests who join optional water or adventure activities do so at their own risk and must follow all safety instructions.</p>';

const cancellationPolicy = (hours = 24) =>
  `Free cancellation up to ${hours} hours before the scheduled departure time. Cancellations within ${hours} hours of departure, or no-shows, are charged 100% of the booking value. Date changes are subject to availability.`;

const htmlList = (items: string[]) =>
  `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;

const htmlParagraphs = (items: string[]) =>
  items.map((item) => `<p>${item}</p>`).join('');

const roundPrice = (value: number) => Math.round(value / 10000) * 10000;

const buildDetail = (type: TourType, input: DetailInput): TourDetailSeed => {
  const childRatio = input.childRatio ?? 0.7;
  const groupChild = roundPrice(input.groupAdult * childRatio);
  const privateChild = roundPrice(input.privateAdult * childRatio);
  const baseAdult = type === 'PRIVATE_TOUR' ? input.privateAdult : input.groupAdult;
  const baseChild = type === 'PRIVATE_TOUR' ? privateChild : groupChild;
  const included =
    input.baseServices === false ? input.included : [...BASE_INCLUDED, ...input.included];

  const itineraries: TourDetailSeed['itineraries'] = [];
  input.itinerary.forEach((plan) => {
    const dayNumber = plan.day ?? 1;
    plan.stops.forEach(([time, title, location, description, map], index) => {
      itineraries.push({
        dayNumber,
        orderIndex: index,
        title,
        description: `<p>${description}</p>`,
        timeSlot: time,
        location,
        imageUrl: null,
        mapQuery: map ?? location,
      });
    });
  });

  return {
    adultPrice: baseAdult,
    childPrice: baseChild,
    infantPrice: 0,
    currency: 'VND',
    cancellationPolicy: cancellationPolicy(),
    departureLocation: input.departureLocation ?? DEFAULT_PICKUP,
    transportation: input.transportation,
    overview: htmlParagraphs(input.overview),
    includedServices: htmlList(included),
    excludedServices: htmlList([...BASE_EXCLUDED, ...(input.excluded ?? [])]),
    childrenPolicy: CHILDREN_POLICY,
    regulations: REGULATIONS,
    highlights: htmlList(input.highlights),
    insurancePolicy: INSURANCE_POLICY,
    mapQuery: input.mapQuery,
    typePrices: [
      {
        type: 'GROUP_TOUR' as TourType,
        adultPrice: input.groupAdult,
        childPrice: groupChild,
        infantPrice: 0,
        currency: 'VND',
      },
      {
        type: 'PRIVATE_TOUR' as TourType,
        adultPrice: input.privateAdult,
        childPrice: privateChild,
        infantPrice: 0,
        currency: 'VND',
      },
    ],
    itineraries,
  };
};

export const TOUR_DETAILS: Record<string, TourDetailSeed> = {
  'TOUR-0001': buildDetail('GROUP_TOUR', {
    groupAdult: 890000,
    privateAdult: 2450000,
    transportation: 'Air-conditioned minivan, Mekong Delta boat and walking',
    mapQuery: '10.3639,106.3628',
    overview: [
      'Escape the city on a relaxed full-day journey into the Mekong Delta. This small-group tour visits My Tho, the ornate Vinh Trang Pagoda and the coconut-lined waterways of Ben Tre.',
      'With a maximum of 12 guests, you will have time to meet local families, taste tropical fruit and drift through narrow canals that larger boats cannot reach.',
    ],
    highlights: [
      'Visit the beautiful Vinh Trang Pagoda, one of the most photographed temples in the delta',
      'Cruise the Tien River and explore Thoi Son Island by rowing sampan',
      'Taste honey tea, tropical fruit and coconut candy made by local families',
      'Enjoy a southern lunch featuring elephant ear fish',
      'Small group of no more than 12 guests with an English-speaking guide',
    ],
    included: [
      'Set lunch with Vietnamese dishes and fresh fruit',
      'Honey tea, tropical fruit and coconut candy tasting',
      'Rowing sampan ride through the coconut canals',
    ],
    itinerary: [
      {
        stops: [
          ['07:30 - 08:00', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Our guide and driver collect you from your hotel in an air-conditioned minivan and drive south-west towards My Tho.', '10.7769,106.7009'],
          ['09:30', 'Vinh Trang Pagoda', 'My Tho, Tien Giang', 'Explore the elegant pagoda, a blend of Vietnamese, Chinese and French architecture surrounded by mature gardens.', '10.3639,106.3628'],
          ['10:45', 'Boat cruise on the Tien River', 'My Tho boat station', 'Board a local wooden boat for a scenic cruise past fish farms and stilt houses towards Thoi Son Island.', '10.3544,106.3651'],
          ['11:30', 'Honey tea, fruit and folk music', 'Thoi Son Island', 'Visit a family-run bee farm, sip honey tea and enjoy seasonal fruit while local musicians perform southern folk songs.', '10.3488,106.3688'],
          ['12:30', 'Lunch at a garden restaurant', 'Thoi Son Island', 'Enjoy a generous set lunch with elephant ear fish, fresh spring rolls, clay-pot pork and garden vegetables.', '10.3465,106.3710'],
          ['14:00', 'Coconut candy and rowing sampan', 'Ben Tre coconut village', 'Watch coconut candy being made by hand, then glide through narrow palm-lined canals in a traditional sampan.', '10.2420,106.3758'],
          ['16:00 - 18:30', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We return to the city by minivan and drop you at your hotel, with time left for dinner.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0002': buildDetail('GROUP_TOUR', {
    groupAdult: 750000,
    privateAdult: 2100000,
    transportation: 'Air-conditioned minivan and walking',
    mapQuery: '11.1428,106.4614',
    overview: [
      'Ben Duoc is the authentic, less crowded section of the Cu Chi tunnel network. This small-group tour takes you into the shaded jungle where the tunnels were built and used during the war.',
      'You will crawl through restored passages, see hidden kitchens and learn how local fighters survived underground for long periods.',
    ],
    highlights: [
      'Explore the quieter Ben Duoc tunnel site instead of the crowded Ben Dinh section',
      'Crawl through restored tunnel sections and see meeting rooms and trap doors',
      'Learn how rubber and cassava were used to survive underground',
      'Visit the Ben Duoc memorial temple dedicated to local soldiers',
      'Small group with hotel pickup and a local guide',
    ],
    included: [
      'Entrance ticket to the Ben Duoc tunnel site',
      'Local lunch with rice, pork, vegetables and cassava',
      'Tapioca and tea tasting',
    ],
    itinerary: [
      {
        stops: [
          ['07:30 - 08:00', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We pick you up and drive north-west towards Cu Chi, with a short rest stop on the way.', '10.7769,106.7009'],
          ['09:30', 'Ben Duoc memorial temple', 'Ben Duoc, Cu Chi', 'Begin at the peaceful memorial temple, where the names of local soldiers are recorded on stone tablets.', '11.1428,106.4614'],
          ['10:00', 'Cu Chi Ben Duoc tunnel network', 'Ben Duoc, Cu Chi', 'Explore hidden entrances, ventilation shafts and fighting positions. You can choose a short crawl or stay above ground.', '11.1428,106.4614'],
          ['11:30', 'Field kitchen and trap exhibition', 'Ben Duoc, Cu Chi', 'See the underground kitchen and the ingenious traps used to protect the tunnel entrances.', '11.1435,106.4602'],
          ['12:30', 'Lunch and cassava tasting', 'Ben Duoc, Cu Chi', 'Rest in the shaded garden and enjoy a simple local lunch with cassava, sesame salt and hot tea.', '11.1418,106.4625'],
          ['13:30 - 16:30', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We drive back to the city and drop you at your hotel.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0003': buildDetail('PRIVATE_TOUR', {
    groupAdult: 450000,
    privateAdult: 450000,
    transportation: 'Private air-conditioned car with professional driver',
    mapQuery: '10.8188,106.6520',
    overview: [
      'Start or end your trip without stress with a private airport transfer between Tan Son Nhat International Airport and your hotel in Ho Chi Minh City. Your driver tracks your flight and waits with a name board in the arrivals hall.',
      'Choose a 4-seat car, 7-seat MPV or 16-seat van according to your group size. The service runs 24 hours a day, including early and late flights.',
    ],
    highlights: [
      'Meet-and-greet service inside the arrivals hall with a personalised name board',
      'Flight tracking so the driver waits if your flight is delayed',
      'Private vehicle for your group only, with no shared transfers',
      'Professional, licensed driver and clean air-conditioned vehicle',
      'Fixed price with tolls, parking and fuel included',
    ],
    included: [
      'One-way private transfer between Tan Son Nhat Airport and your city hotel',
      'Meet-and-greet service and 60 minutes of free waiting time after landing',
      'Tolls, airport parking and fuel',
      'Child seat on request',
    ],
    excluded: [
      'Extra waiting time beyond 60 minutes (charged per hour)',
      'Transfers to hotels outside Ho Chi Minh City centre',
    ],
    baseServices: false,
    itinerary: [
      {
        stops: [
          ['On arrival', 'Meet your driver at Tan Son Nhat Airport', 'Tan Son Nhat International Airport', 'After landing, collect your luggage and meet your driver in the arrivals hall. The driver helps with your bags and walks you to the vehicle.', '10.8188,106.6520'],
          ['30 - 60 minutes', 'Private transfer to your hotel', 'Ho Chi Minh City centre', 'Travel directly to your hotel in a clean, air-conditioned vehicle, with the route chosen according to live traffic.', '10.7769,106.7009'],
          ['On departure', 'Hotel pickup for your return flight', 'Ho Chi Minh City centre', 'For the return leg, the driver arrives at your hotel at the agreed time and takes you to the correct terminal.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0004': buildDetail('GROUP_TOUR', {
    groupAdult: 1350000,
    privateAdult: 2800000,
    transportation: 'Open-top jeep and walking',
    mapQuery: '11.0833,108.3167',
    overview: [
      'Explore the sand dunes and coastal scenery around Mui Ne on an open-top jeep. Choose the sunrise option for cooler air, or the sunset option for golden dunes and a dramatic sky.',
      'The five-hour route covers the White Sand Dunes, Red Sand Dunes, Fairy Stream and a local fishing village, with plenty of photo stops.',
    ],
    highlights: [
      'Ride in an open-top jeep along the coastal road from Mui Ne',
      'Watch sunrise or sunset over the White Sand Dunes',
      'Walk barefoot through the shallow water of Fairy Stream',
      'See the colourful round fishing boats at Mui Ne fishing village',
      'Small group with a local driver-guide and flexible photo stops',
    ],
    included: [
      'Open-top jeep with experienced local driver-guide',
      'Hotel pickup and drop-off in Mui Ne or Phan Thiet',
      'Entrance fees for the sand dunes and Fairy Stream',
      'Bottled water',
    ],
    departureLocation:
      'Pickup from hotels in Mui Ne, Ham Tien and Phan Thiet. Please provide your hotel name when booking.',
    itinerary: [
      {
        stops: [
          ['04:30 - 05:00', 'Sunrise pickup in Mui Ne', 'Mui Ne, Phan Thiet', 'Your driver-guide collects you in an open-top jeep and drives along the coast as the sky brightens. The sunset option starts at 13:30.', '10.9333,108.2833'],
          ['05:15', 'White Sand Dunes at sunrise', 'Bau Trang, Mui Ne', 'Walk to the viewpoint or rent an ATV at your own expense. The low light makes the sand ripple in shades of pink and gold.', '11.0833,108.3167'],
          ['06:45', 'Red Sand Dunes', 'Doi Hong, Mui Ne', 'Stop at the smaller Red Sand Dunes, where local children offer plastic sleds for a quick slide down the slope.', '10.9500,108.2833'],
          ['07:45', 'Mui Ne fishing village', 'Mui Ne fishing village', 'Walk along the beach where hundreds of round basket boats are pulled ashore and fishermen sort their catch.', '10.9333,108.3000'],
          ['08:30', 'Fairy Stream', 'Suoi Tien, Mui Ne', 'Follow the shallow stream between red clay walls and palm trees. The water is usually ankle-deep, so bring sandals.', '10.9417,108.2917'],
          ['09:30', 'Return to your hotel', 'Mui Ne, Phan Thiet', 'We drive back along the coast and drop you at your hotel in time for breakfast.', '10.9333,108.2833'],
        ],
      },
    ],
  }),

  'TOUR-0005': buildDetail('GROUP_TOUR', {
    groupAdult: 1190000,
    privateAdult: 3200000,
    transportation: 'Air-conditioned minivan, Mekong Delta boat and walking',
    mapQuery: '10.3639,106.3628',
    overview: [
      'Combine the two most popular day trips from Saigon into one carefully paced day. In the morning you explore the Ben Duoc tunnels, then continue to My Tho for a relaxed Mekong Delta boat trip and lunch.',
      'The group is limited to ten guests, which means shorter waits and a quieter experience at each stop.',
    ],
    highlights: [
      'Visit the less crowded Ben Duoc tunnel site',
      'Cruise the Tien River and row through coconut canals',
      'Lunch at a riverside garden restaurant',
      'Taste honey tea, tropical fruit and coconut candy',
      'Maximum ten guests for a more personal pace',
    ],
    included: [
      'Lunch at a local garden restaurant',
      'Entrance fees for Ben Duoc tunnels and the Mekong boat',
      'Honey tea, fruit and coconut candy tasting',
    ],
    itinerary: [
      {
        stops: [
          ['07:00 - 07:30', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Our small group leaves early to beat the traffic and drives first to Cu Chi.', '10.7769,106.7009'],
          ['08:45', 'Ben Duoc Cu Chi tunnels', 'Ben Duoc, Cu Chi', 'Explore the shaded tunnel site, including hidden entrances, kitchens and the memorial temple.', '11.1428,106.4614'],
          ['11:00', 'Drive to My Tho', 'My Tho, Tien Giang', 'We leave Cu Chi and drive south to My Tho, passing rubber plantations and rice fields.', '10.3600,106.3600'],
          ['12:15', 'Lunch at a garden restaurant', 'My Tho, Tien Giang', 'Enjoy a relaxed lunch with local Mekong specialties, including fresh fish and spring rolls.', '10.3588,106.3622'],
          ['13:15', 'Mekong boat trip and islands', 'My Tho boat station', 'Cruise the Tien River, visit a coconut candy workshop and take a rowing sampan through small canals.', '10.3544,106.3651'],
          ['15:30 - 18:00', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We return to the city by minivan and drop you at your hotel.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0006': buildDetail('GROUP_TOUR', {
    groupAdult: 1250000,
    privateAdult: 3400000,
    transportation: 'Air-conditioned minivan and walking',
    mapQuery: '10.5333,107.2500',
    overview: [
      'This history-focused day trip follows the Australian military presence in southern Vietnam. Visit the Long Tan Cross, the Nui Dat base area and the Australian Logistics Base before relaxing at the beach in Vung Tau.',
      'The tour is designed for travellers interested in the Vietnam War from an Australian perspective, with a guide who explains the battles and the communities around them.',
    ],
    highlights: [
      'Pay respects at the Long Tan Cross and hear the story of the 1966 battle',
      'Explore the former Nui Dat base area and SAS hill',
      'Visit the Australian Logistics Base and its small museum',
      'Enjoy free time and a seafood lunch in Vung Tau',
      'Small group with hotel pickup from Ho Chi Minh City',
    ],
    included: [
      'Lunch at a local restaurant in Vung Tau',
      'Entrance fees and donations at memorial sites',
      'Hotel pickup and drop-off in District 1',
    ],
    itinerary: [
      {
        stops: [
          ['07:00 - 07:30', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We leave the city early and drive east towards Ba Ria-Vung Tau province.', '10.7769,106.7009'],
          ['09:00', 'Long Tan Cross', 'Long Tan, Ba Ria-Vung Tau', 'Stop at the memorial site of the 1966 Battle of Long Tan and hear the story of the Australian soldiers who fought there.', '10.5333,107.2500'],
          ['10:15', 'Nui Dat and SAS Hill', 'Nui Dat, Ba Ria-Vung Tau', 'See the remains of the airstrip and climb the small hill used by the Special Air Service for views over the rubber plantations.', '10.5500,107.2333'],
          ['11:30', 'Australian Logistics Base', 'Vung Tau, Ba Ria-Vung Tau', 'Visit the former logistics base, now a peaceful compound with a small collection of photographs and memorial items.', '10.3500,107.0833'],
          ['12:30', 'Lunch in Vung Tau', 'Vung Tau city centre', 'Enjoy a local lunch with fresh seafood and Vietnamese dishes. Non-seafood options are available on request.', '10.3460,107.0843'],
          ['14:00', 'Free time at Vung Tau beach', 'Back Beach, Vung Tau', 'Relax on the sand or walk along the promenade before the return drive.', '10.3460,107.0920'],
          ['16:30 - 19:00', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We drive back to the city and drop you at your hotel in the early evening.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0007': buildDetail('GROUP_TOUR', {
    groupAdult: 2290000,
    privateAdult: 5400000,
    transportation: 'Air-conditioned minivan, ferry, bicycle and walking',
    mapQuery: '11.4480,107.4260',
    overview: [
      'Nam Cat Tien National Park is one of Vietnam&apos;s most important lowland forests. This two-day trip combines easy trekking, cycling and wildlife spotting with a comfortable overnight stay near the park entrance.',
      'The pace is relaxed but active, with walks of two to three hours and flat cycling paths. A night safari gives you a chance to see civets, deer and night birds.',
    ],
    highlights: [
      'Trek through the ancient forest of Nam Cat Tien National Park',
      'Cycle through the park and along the Dong Nai River',
      'Join a night safari by open jeep to look for nocturnal wildlife',
      'Visit the Dao Tien endangered primate rescue centre',
      'Stay overnight in a comfortable bungalow near the park',
    ],
    included: [
      'One night in a garden bungalow with breakfast',
      'Three main meals and drinking water',
      'Park entrance fees, ferry crossing and night safari',
      'Bicycle rental and local park guide',
    ],
    itinerary: [
      {
        day: 1,
        stops: [
          ['07:00 - 07:30', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We drive north-east towards Nam Cat Tien, with a short stop for coffee and snacks.', '10.7769,106.7009'],
          ['10:30', 'Ferry across the Dong Nai River', 'Nam Cat Tien National Park', 'Cross the river by local ferry and enter the forest. The park entrance is a short drive from the pier.', '11.4480,107.4260'],
          ['11:30', 'Lunch and check-in', 'Nam Cat Tien park village', 'Enjoy lunch at the bungalow and settle into your room before the afternoon walk.', '11.4450,107.4300'],
          ['13:00', 'Afternoon forest trek', 'Nam Cat Tien National Park', 'Walk with a park guide along shaded trails to see huge tung trees and learn about medicinal plants.', '11.4480,107.4260'],
          ['16:30', 'Wildlife viewing at dusk', 'Bau Sau area', 'Visit the wetland area at dusk, when deer and birds come out to feed.', '11.4400,107.4200'],
          ['18:30', 'Dinner and night safari', 'Nam Cat Tien park village', 'After dinner, board an open jeep for a night safari with a spotlight to find civets and other nocturnal animals.', '11.4480,107.4260'],
        ],
      },
      {
        day: 2,
        stops: [
          ['06:30', 'Morning birding walk', 'Nam Cat Tien National Park', 'Wake early for the best bird activity. The guide helps you identify calls and movements in the canopy.', '11.4480,107.4260'],
          ['08:00', 'Breakfast at the bungalow', 'Nam Cat Tien park village', 'Return for breakfast and a short rest. Check-out is at 10:00, but you can leave your bags at reception.', '11.4450,107.4300'],
          ['09:00', 'Cycling through the forest', 'Nam Cat Tien National Park', 'Ride along flat park roads, passing rubber trees and small clearings. The route can be shortened if you prefer.', '11.4480,107.4260'],
          ['10:30', 'Dao Tien primate rescue centre', 'Nam Cat Tien National Park', 'Visit the rescue centre for endangered primates, including golden-cheeked gibbons.', '11.4500,107.4230'],
          ['11:30', 'Lunch and return to the city', 'Nam Cat Tien park village', 'Have lunch before the ferry crossing and the drive back to Ho Chi Minh City.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0008': buildDetail('GROUP_TOUR', {
    groupAdult: 890000,
    privateAdult: 2400000,
    transportation: 'Air-conditioned minivan, Mekong Delta boat and bicycle',
    mapQuery: '10.3333,105.9833',
    overview: [
      'This full-day tour explores Cai Be and Vinh Long, the quieter side of the Mekong Delta. Instead of the busy My Tho route, you will visit a floating market, family workshops and an orchard island by small boat.',
      'The group is limited to ten guests, so you can cycle through village lanes, talk with local hosts and enjoy a home-cooked lunch without feeling rushed.',
    ],
    highlights: [
      'Visit the Cai Be floating market early in the morning',
      'Explore An Binh Island by small boat and bicycle',
      'See coconut candy, rice paper and mat weaving families at work',
      'Lunch in a traditional wooden house surrounded by orchards',
      'Maximum ten guests for a relaxed, less touristy experience',
    ],
    included: [
      'Cai Be floating market boat trip',
      'Lunch in a local garden house',
      'Bicycle rental on An Binh Island',
      'Fruit tasting and coconut candy samples',
    ],
    itinerary: [
      {
        stops: [
          ['07:30 - 08:00', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We leave the city early and drive south-west to Cai Be, with a short rest stop on the highway.', '10.7769,106.7009'],
          ['09:30', 'Cai Be floating market', 'Cai Be, Tien Giang', 'Cruise through the floating market, where local traders sell fruit and vegetables from their boats.', '10.3333,105.9833'],
          ['10:30', 'Coconut candy and rice paper workshops', 'Cai Be village', 'Stop at family workshops to see coconut candy being cooked and rice paper drying in the sun.', '10.3300,105.9800'],
          ['11:30', 'Boat to An Binh Island', 'An Binh Island, Vinh Long', 'Cross to An Binh Island, a green patchwork of fruit orchards and narrow canals.', '10.3000,105.9667'],
          ['12:30', 'Lunch in a garden house', 'An Binh Island', 'Enjoy a home-cooked lunch with fresh river fish, spring rolls and fruit from the garden.', '10.2980,105.9680'],
          ['14:00', 'Bicycle ride through the orchards', 'An Binh Island', 'Cycle along flat village paths between rambutan, longan and jackfruit trees, with a fruit tasting stop.', '10.3000,105.9667'],
          ['15:30 - 18:30', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Take the boat back to Vinh Long and drive to the city. Drop-off at your hotel is around 18:30.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0009': buildDetail('GROUP_TOUR', {
    groupAdult: 790000,
    privateAdult: 1900000,
    transportation: 'Honda scooter with licensed driver and helmet',
    mapQuery: '10.7769,106.7009',
    overview: [
      'See Saigon like a local on the back of a scooter. This flexible tour runs during the day or at night and weaves through the city&apos;s alleys, markets and food streets with a friendly driver-guide.',
      'You will cover the famous landmarks and the neighbourhoods that most visitors never find, with plenty of stops for photos and street food.',
    ],
    highlights: [
      'Ride on the back of a scooter with a safe, licensed driver',
      'Visit Notre Dame Cathedral, the Central Post Office and the Reunification Palace',
      'Explore a local wet market and hidden alleyways',
      'Taste street food at a night market or a local coffee shop',
      'Choose a morning, afternoon or evening departure',
    ],
    included: [
      'Scooter, helmet and licensed driver-guide',
      'Hotel pickup and drop-off in District 1, 3 and 4',
      'One street food tasting and one drink',
      'Rain poncho if needed',
    ],
    itinerary: [
      {
        stops: [
          ['08:00 or 17:30', 'Hotel pickup by scooter', 'District 1, Ho Chi Minh City', 'Your driver-guide arrives with a spare helmet and a quick safety briefing before a slow loop through quieter streets.', '10.7769,106.7009'],
          ['08:30', 'Notre Dame Cathedral and Central Post Office', 'District 1, Ho Chi Minh City', 'Stop at the red-brick cathedral and the grand Central Post Office, two of the city&apos;s best-known colonial landmarks.', '10.7798,106.6990'],
          ['09:30', 'Reunification Palace and War Remnants Museum', 'District 3, Ho Chi Minh City', 'Ride past the Reunification Palace and stop at the War Remnants Museum for a short visit.', '10.7794,106.6922'],
          ['11:00', 'Ben Thanh Market and local alleys', 'District 1, Ho Chi Minh City', 'Walk through Ben Thanh Market and escape into the surrounding alleys where vendors sell fabric, flowers and household goods.', '10.7725,106.6980'],
          ['12:00', 'Street food stop', 'District 4 or District 5', 'Stop for noodles, banh mi or fresh spring rolls at a local stall. The guide helps you order.', '10.7570,106.6900'],
          ['Evening option', 'Night streets and rooftop view', 'District 1 and Bui Vien', 'The evening route replaces some daytime stops with a night market, a local coffee shop and a rooftop view over the city.', '10.7670,106.6930'],
        ],
      },
    ],
  }),

  'TOUR-0010': buildDetail('GROUP_TOUR', {
    groupAdult: 950000,
    privateAdult: 2600000,
    transportation: 'Air-conditioned minivan and walking',
    mapQuery: '10.7769,106.7009',
    overview: [
      'This deluxe small-group tour covers the highlights of Ho Chi Minh City in the morning and the Cu Chi tunnels in the afternoon. The group is limited to ten guests, with a comfortable minivan and a guide who brings the history to life.',
      'You will visit the Reunification Palace, the War Remnants Museum and the colonial landmarks before heading to the less crowded Ben Duoc tunnel site.',
    ],
    highlights: [
      'See the Reunification Palace and the War Remnants Museum with a guide',
      'Admire Notre Dame Cathedral and the Central Post Office',
      'Visit the less crowded Ben Duoc section of the Cu Chi tunnels',
      'Enjoy a local lunch before the afternoon drive',
      'Maximum ten guests and hotel pickup included',
    ],
    included: [
      'Lunch at a local restaurant',
      'Entrance fees for the Reunification Palace, War Remnants Museum and Cu Chi tunnels',
      'Hotel pickup and drop-off in District 1',
    ],
    itinerary: [
      {
        stops: [
          ['07:30 - 08:00', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Our guide collects you from your hotel and introduces the day&apos;s route through the city centre.', '10.7769,106.7009'],
          ['08:30', 'Reunification Palace', 'District 1, Ho Chi Minh City', 'Explore the former presidential palace, preserved as it was in 1975, including the war rooms and reception halls.', '10.7770,106.6958'],
          ['09:30', 'War Remnants Museum', 'District 3, Ho Chi Minh City', 'Visit the museum for a sobering look at the war through photographs, military equipment and personal stories.', '10.7794,106.6922'],
          ['10:30', 'Notre Dame Cathedral and Central Post Office', 'District 1, Ho Chi Minh City', 'Stop for photos at the red-brick cathedral and the grand Central Post Office while the guide explains their history.', '10.7798,106.6990'],
          ['11:30', 'Lunch in the city', 'District 1, Ho Chi Minh City', 'Enjoy a local lunch at a restaurant selected by the guide. Vegetarian options are available with advance notice.', '10.7769,106.7009'],
          ['13:00', 'Cu Chi Ben Duoc tunnels', 'Ben Duoc, Cu Chi', 'Drive to the Ben Duoc tunnel site and spend the afternoon exploring the tunnels, kitchens and memorial temple.', '11.1428,106.4614'],
          ['16:30 - 18:30', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Return to the city by minivan and drop off at your hotel.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0011': buildDetail('GROUP_TOUR', {
    groupAdult: 980000,
    privateAdult: 2700000,
    transportation: 'Air-conditioned minivan, boat and walking',
    mapQuery: '10.7000,105.9333',
    overview: [
      'Combine the history of Cu Chi with the calm waterways of Tan Lap Floating Village. After exploring the tunnels in the morning, you will continue west to Long An province for a boat ride through lotus fields and mangrove forest.',
      'This is a good choice if you want a mix of war history and nature in one day, without the long drive to the deep Mekong Delta.',
    ],
    highlights: [
      'Explore the Ben Duoc Cu Chi tunnel site',
      'Boat ride through the lotus fields of Tan Lap Floating Village',
      'Walk the wooden boardwalk through the wetland forest',
      'See birds and lotus flowers in a quiet nature reserve',
      'Small group with hotel pickup and lunch included',
    ],
    included: [
      'Lunch at a local restaurant',
      'Entrance fees for Cu Chi and Tan Lap',
      'Boat ride and boardwalk visit at Tan Lap',
    ],
    itinerary: [
      {
        stops: [
          ['07:30 - 08:00', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We leave the city and drive to Cu Chi, arriving before the larger tour groups.', '10.7769,106.7009'],
          ['09:30', 'Cu Chi Ben Duoc tunnels', 'Ben Duoc, Cu Chi', 'Explore the tunnels, hidden kitchens and memorial temple with your guide.', '11.1428,106.4614'],
          ['12:00', 'Lunch en route to Tan Lap', 'Trang Bang or Duc Hoa', 'Stop for lunch at a local restaurant before continuing west towards Long An province.', '10.9500,106.4000'],
          ['13:30', 'Tan Lap Floating Village boat ride', 'Tan Lap, Long An', 'Board a small boat and glide through lotus fields and canals while the guide explains the wetland ecosystem.', '10.7000,105.9333'],
          ['15:00', 'Wetland boardwalk and observation tower', 'Tan Lap, Long An', 'Walk the wooden boardwalk through the forest and climb the tower for a wide view over the lotus fields.', '10.7000,105.9333'],
          ['16:30 - 18:30', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Drive back to the city and drop off at your hotel. The return time may vary with traffic.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0012': buildDetail('GROUP_TOUR', {
    groupAdult: 2190000,
    privateAdult: 5200000,
    transportation: 'Air-conditioned minivan, boat and walking',
    mapQuery: '10.0333,105.7833',
    overview: [
      'This two-day tour connects the Cu Chi tunnels with the Mekong Delta and the famous Cai Rang floating market in Can Tho. You will spend the night in Can Tho and wake early for the market at its busiest.',
      'The pace is comfortable, with a mix of history, boat rides and local food. Accommodation is in a centrally located hotel on the Can Tho riverfront.',
    ],
    highlights: [
      'Explore the Cu Chi tunnels with a local guide',
      'Cruise the Mekong Delta and visit a coconut candy workshop',
      'Stay overnight in Can Tho on the riverfront',
      'Visit Cai Rang floating market at sunrise',
      'Learn how rice noodles are made by a local family',
    ],
    included: [
      'One night in a 3-star hotel in Can Tho with breakfast',
      'Three main meals and drinking water',
      'Cu Chi entrance fee, Mekong boat trip and Cai Rang boat',
      'English-speaking guide and hotel pickup',
    ],
    itinerary: [
      {
        day: 1,
        stops: [
          ['07:30', 'Hotel pickup and Cu Chi tunnels', 'District 1, Ho Chi Minh City', 'We leave early and drive to the Cu Chi tunnels, arriving before the midday heat.', '11.1428,106.4614'],
          ['11:30', 'Lunch at a local restaurant', 'Cu Chi, Ho Chi Minh City', 'Enjoy a lunch of Vietnamese dishes before the drive to the Mekong Delta.', '11.1000,106.4500'],
          ['13:00', 'Drive to My Tho and boat trip', 'My Tho, Tien Giang', 'Board a boat for a short cruise on the Tien River and visit an island workshop.', '10.3544,106.3651'],
          ['16:00', 'Drive to Can Tho', 'Can Tho city', 'Continue to Can Tho, check in to your hotel and rest before dinner.', '10.0333,105.7833'],
          ['18:30', 'Dinner and evening free time', 'Can Tho riverfront', 'Dinner at a local restaurant, followed by free time to walk along the river or visit the night market.', '10.0333,105.7833'],
        ],
      },
      {
        day: 2,
        stops: [
          ['05:30', 'Cai Rang floating market', 'Cai Rang, Can Tho', 'Board a small boat before sunrise and cruise to the floating market at its busiest.', '10.0167,105.7833'],
          ['08:00', 'Rice noodle workshop', 'Cai Rang, Can Tho', 'Visit a family workshop where rice noodles are made by hand and taste a fresh sample.', '10.0200,105.7800'],
          ['09:30', 'Return to Can Tho for breakfast', 'Can Tho city', 'Cruise back to the city and enjoy breakfast at the hotel before check-out.', '10.0333,105.7833'],
          ['11:00', 'Drive back to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We drive back with a lunch stop on the way. Arrival in District 1 is around 17:00.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0013': buildDetail('GROUP_TOUR', {
    groupAdult: 880000,
    privateAdult: 2350000,
    transportation: 'Air-conditioned minivan, boat and bicycle',
    mapQuery: '10.2415,106.3758',
    overview: [
      'This tour focuses on the quiet villages and coconut canals of Ben Tre, away from the standard Mekong tourist route. You will travel by small boat, bicycle and foot through coconut palms, fruit orchards and rice fields.',
      'The group is limited to ten guests, so there is time to talk with local families and enjoy a slow lunch in a garden house.',
    ],
    highlights: [
      'Explore the coconut kingdom of Ben Tre by boat and bicycle',
      'Visit a family workshop making coconut oil and candy',
      'Cycle through quiet village lanes and fruit orchards',
      'Enjoy a home-cooked lunch in a garden house',
      'Maximum ten guests for a peaceful, non-touristy experience',
    ],
    included: [
      'Lunch in a local garden house',
      'Boat rides and bicycle rental',
      'Coconut candy and fruit tasting',
      'Hotel pickup and drop-off in District 1',
    ],
    itinerary: [
      {
        stops: [
          ['07:30 - 08:00', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We drive south to Ben Tre, crossing the Rach Mieu bridge while the guide introduces the coconut economy.', '10.7769,106.7009'],
          ['09:30', 'Coconut workshop and canal boat', 'Ben Tre coconut village', 'Visit a family workshop making coconut oil and candy, then take a small boat through palm-lined canals.', '10.2415,106.3758'],
          ['11:30', 'Lunch in a garden house', 'Ben Tre countryside', 'Enjoy a home-cooked lunch with river fish, coconut rice and fresh vegetables.', '10.2350,106.3800'],
          ['13:00', 'Bicycle ride through the villages', 'Ben Tre countryside', 'Cycle along flat paths between coconut groves and orchards, with a fruit tasting stop at a local home.', '10.2380,106.3780'],
          ['14:30', 'Handicraft village and river ferry', 'Ben Tre province', 'Visit a small handicraft workshop and take a local ferry across the river for a glimpse of daily life.', '10.2450,106.3700'],
          ['16:00 - 18:30', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We drive back to the city and drop you at your hotel.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0014': buildDetail('GROUP_TOUR', {
    groupAdult: 850000,
    privateAdult: 2300000,
    transportation: 'Air-conditioned minivan and walking',
    mapQuery: '10.7794,106.6922',
    overview: [
      'This small-group tour pairs the War Remnants Museum in Ho Chi Minh City with the Ben Duoc tunnels in Cu Chi. It is an efficient way to understand the war from two perspectives in a single day.',
      'The guide provides context at both sites and encourages questions. The group is kept small so you can hear the commentary and move through the museums without feeling herded.',
    ],
    highlights: [
      'Visit the War Remnants Museum with a knowledgeable guide',
      'Explore the less crowded Ben Duoc tunnel site',
      'See the memorial temple and the underground kitchens',
      'Small group of no more than 12 guests',
      'Hotel pickup and lunch included',
    ],
    included: [
      'Lunch at a local restaurant',
      'Entrance fees for the War Remnants Museum and Cu Chi tunnels',
      'Hotel pickup and drop-off in District 1',
    ],
    itinerary: [
      {
        stops: [
          ['07:30 - 08:00', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Start the day with a hotel pickup and go first to the War Remnants Museum before the larger groups arrive.', '10.7769,106.7009'],
          ['08:30', 'War Remnants Museum', 'District 3, Ho Chi Minh City', 'Explore the permanent exhibitions and the military equipment in the courtyard while the guide explains the context.', '10.7794,106.6922'],
          ['10:00', 'Drive to Cu Chi', 'Cu Chi, Ho Chi Minh City', 'Leave the city and drive to Cu Chi, with a short rest stop on the way.', '11.1428,106.4614'],
          ['11:15', 'Ben Duoc tunnels', 'Ben Duoc, Cu Chi', 'Explore the quieter Ben Duoc site, including hidden entrances, kitchens and the memorial temple.', '11.1428,106.4614'],
          ['12:30', 'Lunch and return', 'Cu Chi, Ho Chi Minh City', 'Enjoy a local lunch before driving back to the city. Drop-off is around 15:30.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0015': buildDetail('GROUP_TOUR', {
    groupAdult: 1150000,
    privateAdult: 3050000,
    transportation: 'Air-conditioned minivan, boat and walking',
    mapQuery: '11.1428,106.4614',
    overview: [
      'This premium small-group tour combines the quieter Ben Duoc tunnels with a relaxed Mekong Delta afternoon. The group is capped at ten guests, with a comfortable minivan and a guide who adapts the pace.',
      'You will avoid the busiest tunnel site and the most crowded Mekong stops, focusing on local families and smaller waterways.',
    ],
    highlights: [
      'Explore the less crowded Ben Duoc tunnel site',
      'Enjoy a Mekong Delta boat ride away from the main tourist route',
      'Visit a family coconut workshop and fruit garden',
      'Lunch at a local garden restaurant',
      'Maximum ten guests for a more personal experience',
    ],
    included: [
      'Lunch at a local garden restaurant',
      'Entrance fees for Ben Duoc and the Mekong boat',
      'Fruit and coconut candy tasting',
    ],
    itinerary: [
      {
        stops: [
          ['07:00 - 07:30', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We leave early to reach the tunnels before the crowds.', '10.7769,106.7009'],
          ['09:00', 'Ben Duoc Cu Chi tunnels', 'Ben Duoc, Cu Chi', 'Explore the tunnel network, memorial temple and outdoor exhibits with your guide.', '11.1428,106.4614'],
          ['11:30', 'Drive to the Mekong Delta', 'My Tho, Tien Giang', 'Continue south as the landscape changes from rubber plantations to rice fields and coconut palms.', '10.3600,106.3600'],
          ['12:30', 'Lunch and boat ride', 'My Tho, Tien Giang', 'Enjoy lunch at a garden restaurant, then board a small boat for a cruise through the canals.', '10.3544,106.3651'],
          ['14:00', 'Coconut village and rowing sampan', 'Ben Tre coconut village', 'Visit a coconut candy workshop and take a rowing sampan through narrow waterways.', '10.2420,106.3758'],
          ['16:00 - 18:30', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Drive back to the city and drop off at your hotel.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0016': buildDetail('GROUP_TOUR', {
    groupAdult: 2090000,
    privateAdult: 4900000,
    transportation: 'Air-conditioned minivan, boat and walking',
    mapQuery: '10.0333,105.7833',
    overview: [
      'This two-day Mekong Delta tour takes you from Ho Chi Minh City to Can Tho, with an overnight stay on the riverfront. The highlight is an early-morning boat trip to Cai Rang floating market.',
      'The itinerary includes a coconut workshop, a fruit garden and a rice noodle family business, with plenty of time to relax in Can Tho.',
    ],
    highlights: [
      'Cruise the Mekong Delta and visit a coconut candy workshop',
      'Stay overnight in Can Tho on the riverfront',
      'Visit Cai Rang floating market at sunrise',
      'See rice noodles being made by hand',
      'Small group with a local guide and comfortable transport',
    ],
    included: [
      'One night in a 3-star hotel in Can Tho with breakfast',
      'Two lunches, one dinner and drinking water',
      'Boat trips and entrance fees',
      'Hotel pickup and drop-off in District 1',
    ],
    itinerary: [
      {
        day: 1,
        stops: [
          ['07:30 - 08:00', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We leave the city and drive south to My Tho, with a short rest stop on the highway.', '10.7769,106.7009'],
          ['09:30', 'Mekong boat trip and coconut workshop', 'My Tho, Tien Giang', 'Board a private boat for a cruise on the Tien River and visit a coconut candy workshop.', '10.3544,106.3651'],
          ['11:30', 'Lunch in a garden restaurant', 'My Tho, Tien Giang', 'Enjoy a local lunch with fresh river fish, spring rolls and seasonal vegetables.', '10.3588,106.3622'],
          ['13:30', 'Drive to Can Tho', 'Can Tho city', 'Continue to Can Tho, check in to your hotel and rest before exploring the riverfront.', '10.0333,105.7833'],
          ['18:30', 'Dinner and free evening', 'Can Tho riverfront', 'Dinner at a local restaurant, followed by free time to walk along the river or visit the night market.', '10.0333,105.7833'],
        ],
      },
      {
        day: 2,
        stops: [
          ['05:30', 'Cai Rang floating market', 'Cai Rang, Can Tho', 'Board a small boat before sunrise and watch the market come alive on the river.', '10.0167,105.7833'],
          ['08:00', 'Rice noodle workshop', 'Cai Rang, Can Tho', 'Visit a family workshop where rice noodles are made by hand and taste a fresh noodle with herbs.', '10.0200,105.7800'],
          ['09:30', 'Breakfast and check-out', 'Can Tho city', 'Return to the hotel for breakfast and check-out before the drive back.', '10.0333,105.7833'],
          ['11:00', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Drive back to the city with a lunch stop on the way. Arrival is around 17:00.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0017': buildDetail('GROUP_TOUR', {
    groupAdult: 1490000,
    privateAdult: 3600000,
    transportation: 'Air-conditioned minivan, bicycle and boat',
    mapQuery: '10.0167,105.7833',
    overview: [
      'This long but rewarding day combines the Cai Rang floating market, a countryside bike ride and the Cu Chi tunnels. It is designed for active travellers who want to see both the delta and the war history in a single trip.',
      'The day starts very early in Can Tho and finishes in Ho Chi Minh City, with a mix of boat, bicycle and minivan travel.',
    ],
    highlights: [
      'Visit Cai Rang floating market at sunrise',
      'Cycle through the quiet lanes of the Mekong Delta',
      'Explore the Ben Duoc Cu Chi tunnels',
      'Taste local fruit and rice noodles',
      'Small group with hotel pickup and all transport included',
    ],
    included: [
      'Breakfast, lunch and drinking water',
      'Boat trip, bicycle rental and Cu Chi entrance fee',
      'Hotel pickup in Can Tho and drop-off in Ho Chi Minh City',
    ],
    departureLocation:
      'Pickup from hotels in Can Tho city centre. Guests staying in Ho Chi Minh City can join with an early private transfer at an additional cost.',
    itinerary: [
      {
        stops: [
          ['04:00 - 04:30', 'Early pickup in Can Tho', 'Can Tho city centre', 'Your guide collects you before dawn and takes you to the boat pier. Coffee and a light breakfast are provided on the boat.', '10.0333,105.7833'],
          ['05:00', 'Cai Rang floating market', 'Cai Rang, Can Tho', 'Cruise through the floating market as the first boats arrive and farmers sell fruit directly from their boats.', '10.0167,105.7833'],
          ['07:30', 'Countryside biking', 'Cai Rang countryside', 'Cycle along flat paths beside canals and fruit orchards, with a stop at a local family for fruit and a cold drink.', '10.0200,105.7800'],
          ['10:00', 'Drive to Cu Chi', 'Cu Chi, Ho Chi Minh City', 'Leave Can Tho and drive to Cu Chi, with a lunch stop on the way. The drive takes about three hours.', '11.1428,106.4614'],
          ['14:30', 'Cu Chi Ben Duoc tunnels', 'Ben Duoc, Cu Chi', 'Explore the tunnels, hidden entrances, kitchens and the memorial temple with your guide.', '11.1428,106.4614'],
          ['17:00 - 19:00', 'Drop-off in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Drive to the city and drop you at your hotel. Plan a relaxed dinner after the long day.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0018': buildDetail('GROUP_TOUR', {
    groupAdult: 2350000,
    privateAdult: 5600000,
    transportation: 'Air-conditioned minivan, boat and bicycle',
    mapQuery: '10.3333,105.9833',
    overview: [
      'This two-day tour combines the Cu Chi tunnels with an overnight homestay in the Mekong Delta. You will explore Cai Be and Vinh Long by boat and bicycle, then stay with a local family in a traditional house.',
      'The homestay is simple but comfortable, with a private room, mosquito net and home-cooked meals. It is a genuine look at life in the delta.',
    ],
    highlights: [
      'Explore the Cu Chi tunnels on the first morning',
      'Cruise the Cai Be floating market and small canals',
      'Stay overnight with a local family in a Mekong Delta homestay',
      'Cycle through orchards and villages on An Binh Island',
      'Enjoy home-cooked meals and a cooking demonstration',
    ],
    included: [
      'One night in a local homestay with breakfast',
      'Three main meals and drinking water',
      'Cu Chi entrance fee, boat trips and bicycle rental',
      'English-speaking guide and hotel pickup',
    ],
    itinerary: [
      {
        day: 1,
        stops: [
          ['07:30', 'Hotel pickup and Cu Chi tunnels', 'District 1, Ho Chi Minh City', 'We leave the city early and explore the Cu Chi tunnels with your guide before the heat of the day.', '11.1428,106.4614'],
          ['11:30', 'Lunch and drive to Cai Be', 'Cu Chi to Cai Be', 'Enjoy lunch at a local restaurant, then drive south-west to Cai Be through rice fields and orchards.', '10.3333,105.9833'],
          ['14:00', 'Cai Be floating market and canal boat', 'Cai Be, Tien Giang', 'Board a small boat to explore the floating market, narrow canals and a coconut candy workshop.', '10.3333,105.9833'],
          ['16:30', 'Homestay check-in and cooking class', 'An Binh Island, Vinh Long', 'Cross to An Binh Island, settle into your homestay and help the family prepare dinner.', '10.3000,105.9667'],
          ['19:00', 'Dinner with the host family', 'An Binh Island, Vinh Long', 'Enjoy a home-cooked dinner in the garden, then relax or talk with the family.', '10.2980,105.9680'],
        ],
      },
      {
        day: 2,
        stops: [
          ['06:30', 'Morning market walk', 'An Binh Island, Vinh Long', 'Take a short walk to the local morning market and see how the island wakes up. Breakfast follows at the homestay.', '10.3000,105.9667'],
          ['08:30', 'Bicycle ride through the orchards', 'An Binh Island, Vinh Long', 'Cycle along flat village paths between fruit orchards and canals, with a seasonal fruit tasting.', '10.3000,105.9667'],
          ['10:30', 'Boat back to Vinh Long', 'Vinh Long city', 'Return to the mainland by boat and visit a local market before lunch.', '10.2539,105.9722'],
          ['11:30', 'Lunch and return to Ho Chi Minh City', 'Vinh Long to District 1', 'Enjoy lunch in Vinh Long before the drive back. Drop-off at your hotel is around 17:00.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0019': buildDetail('GROUP_TOUR', {
    groupAdult: 1390000,
    privateAdult: 3300000,
    transportation: 'Air-conditioned minivan, boat and walking',
    mapQuery: '10.0167,105.7833',
    overview: [
      'This full-day tour visits three of the Mekong Delta&apos;s best-known markets and waterways: Cai Rang, Vinh Long and Cai Be. It is a long day with an early start, but you will see a huge variety of delta life.',
      'The tour is ideal for travellers who want to cover as much of the delta as possible in one day, with floating markets, village workshops and local food.',
    ],
    highlights: [
      'Visit Cai Rang floating market in the early morning',
      'Explore Vinh Long and the orchards of An Binh Island',
      'See the Cai Be floating market and canal workshops',
      'Taste local fruit, coconut candy and rice noodles',
      'Small group with comfortable transport and a local guide',
    ],
    included: [
      'Breakfast, lunch and drinking water',
      'All boat trips and entrance fees',
      'Hotel pickup in District 1',
    ],
    itinerary: [
      {
        stops: [
          ['04:30', 'Early pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We leave the city before dawn and drive directly to Can Tho. Breakfast is served on arrival.', '10.7769,106.7009'],
          ['07:00', 'Cai Rang floating market', 'Cai Rang, Can Tho', 'Board a small boat and cruise through the floating market as traders sell fruit and noodles from their boats.', '10.0167,105.7833'],
          ['09:00', 'Drive to Vinh Long', 'Vinh Long city', 'Leave Can Tho and drive to Vinh Long, crossing the Hau and Tien rivers.', '10.2539,105.9722'],
          ['11:30', 'Lunch on An Binh Island', 'An Binh Island, Vinh Long', 'Cross to An Binh Island by boat and enjoy lunch in a garden house with river fish and fresh fruit.', '10.3000,105.9667'],
          ['13:00', 'Cai Be floating market and workshops', 'Cai Be, Tien Giang', 'Continue by boat to Cai Be to see the floating market and family workshops making coconut candy and rice paper.', '10.3333,105.9833'],
          ['15:30 - 19:30', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Drive back to the city, arriving in the evening. Drop-off at your hotel is included.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0020': buildDetail('GROUP_TOUR', {
    groupAdult: 2250000,
    privateAdult: 5300000,
    transportation: 'Air-conditioned minivan, boat and walking',
    mapQuery: '10.0167,105.7833',
    overview: [
      'This two-day tour combines the Cu Chi tunnels with the Mekong Delta and Cai Rang floating market. It is a balanced introduction to the history and daily life of southern Vietnam.',
      'You will stay overnight in Can Tho and visit the floating market early in the morning, when the river is at its most active.',
    ],
    highlights: [
      'Explore the Cu Chi tunnels with a local guide',
      'Cruise the Mekong Delta and visit a coconut workshop',
      'Stay overnight in Can Tho',
      'Visit Cai Rang floating market at sunrise',
      'Enjoy local food and a comfortable small-group pace',
    ],
    included: [
      'One night in a 3-star hotel in Can Tho with breakfast',
      'Three main meals and drinking water',
      'Cu Chi entrance fee, boat trips and Cai Rang boat',
      'Hotel pickup and drop-off in District 1',
    ],
    itinerary: [
      {
        day: 1,
        stops: [
          ['07:30', 'Hotel pickup and Cu Chi tunnels', 'District 1, Ho Chi Minh City', 'We leave the city early and explore the tunnels and surrounding forest before the day gets hot.', '11.1428,106.4614'],
          ['11:30', 'Lunch and drive to the delta', 'Cu Chi to My Tho', 'Lunch at a local restaurant, then drive south to My Tho while the guide explains the delta geography.', '10.3600,106.3600'],
          ['14:00', 'Mekong boat trip and island visit', 'My Tho, Tien Giang', 'Cruise the Tien River and visit a coconut candy workshop and fruit garden on Thoi Son Island.', '10.3544,106.3651'],
          ['16:30', 'Drive to Can Tho and check in', 'Can Tho city', 'Continue to Can Tho and check in to your hotel. The evening is free to relax or walk along the riverfront.', '10.0333,105.7833'],
          ['18:30', 'Dinner in Can Tho', 'Can Tho riverfront', 'Dinner at a local restaurant, followed by free time at the night market or a riverside cafe.', '10.0333,105.7833'],
        ],
      },
      {
        day: 2,
        stops: [
          ['05:30', 'Cai Rang floating market', 'Cai Rang, Can Tho', 'Board a small boat before sunrise and cruise to the floating market for the best light and activity.', '10.0167,105.7833'],
          ['08:00', 'Rice noodle family workshop', 'Cai Rang, Can Tho', 'See how rice noodles are made by hand and taste a fresh sample at a family workshop.', '10.0200,105.7800'],
          ['09:30', 'Breakfast and check-out', 'Can Tho city', 'Return to the hotel for breakfast and check-out before the drive back.', '10.0333,105.7833'],
          ['11:00', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Drive back with a lunch stop on the way. Arrival in District 1 is around 17:00.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0021': buildDetail('GROUP_TOUR', {
    groupAdult: 3690000,
    privateAdult: 8900000,
    transportation: 'Air-conditioned minivan, boat and walking',
    mapQuery: '10.7000,105.1167',
    overview: [
      'This three-day adventure covers the best of the western Mekong Delta: My Tho, Can Tho, Chau Doc and the Tra Su flooded forest. You will see floating markets, Khmer pagodas and a landscape that changes with the seasons.',
      'Accommodation is in comfortable 3-star hotels, with a mix of boat trips, walking and free time in the evenings.',
    ],
    highlights: [
      'Visit Cai Rang floating market in Can Tho',
      'Explore the Tra Su flooded forest by rowing boat',
      'Visit a Khmer pagoda and the Sam Mountain viewpoint in Chau Doc',
      'Cruise the Mekong Delta and visit local workshops',
      'Three days with two nights in comfortable hotels',
    ],
    included: [
      'Two nights in 3-star hotels with breakfast',
      'Five main meals and drinking water',
      'All boat trips and entrance fees',
      'English-speaking guide and hotel pickup',
    ],
    itinerary: [
      {
        day: 1,
        stops: [
          ['07:00 - 07:30', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We drive to My Tho, where the delta begins, while the guide introduces the route.', '10.7769,106.7009'],
          ['09:30', 'Mekong boat trip and island lunch', 'My Tho, Tien Giang', 'Cruise the Tien River, visit a coconut workshop and fruit garden, then enjoy lunch on an island.', '10.3544,106.3651'],
          ['13:30', 'Drive to Can Tho', 'Can Tho city', 'Continue to Can Tho and check in to your hotel. The late afternoon is free by the river.', '10.0333,105.7833'],
          ['18:30', 'Dinner and free evening', 'Can Tho riverfront', 'Dinner at a local restaurant, followed by free time at the riverfront or night market.', '10.0333,105.7833'],
        ],
      },
      {
        day: 2,
        stops: [
          ['05:30', 'Cai Rang floating market', 'Cai Rang, Can Tho', 'Early boat trip to the floating market, followed by a bowl of noodles on the water.', '10.0167,105.7833'],
          ['08:30', 'Breakfast and drive to Chau Doc', 'Can Tho to Chau Doc', 'Return for breakfast and check-out, then drive west to Chau Doc through rice fields and Khmer villages.', '10.7000,105.1167'],
          ['12:30', 'Lunch in Chau Doc', 'Chau Doc, An Giang', 'Enjoy lunch at a local restaurant, where the cuisine has a strong Khmer and Cham influence.', '10.7000,105.1167'],
          ['14:00', 'Tra Su flooded forest', 'Tra Su, An Giang', 'Explore the cajuput forest by rowing boat and motorboat. The forest is especially beautiful in the rainy season.', '10.5833,105.0833'],
          ['17:30', 'Sam Mountain sunset', 'Sam Mountain, Chau Doc', 'Drive up Sam Mountain for sunset views over the rice fields and the Cambodian border.', '10.7167,105.0833'],
          ['19:00', 'Dinner and hotel check-in', 'Chau Doc, An Giang', 'Check in to your hotel and have dinner at a local restaurant.', '10.7000,105.1167'],
        ],
      },
      {
        day: 3,
        stops: [
          ['07:00', 'Chau Doc floating village', 'Chau Doc, An Giang', 'Take a short boat trip to the floating fish farms and the Cham village.', '10.7000,105.1167'],
          ['08:30', 'Khmer pagoda and market', 'Chau Doc, An Giang', 'Visit a colourful Khmer pagoda and the local market while the guide explains the cultural mix of the region.', '10.7000,105.1167'],
          ['10:00', 'Breakfast and check-out', 'Chau Doc, An Giang', 'Return to the hotel for breakfast and check-out before the drive back.', '10.7000,105.1167'],
          ['11:00', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Drive back to the city with a lunch stop on the way. Arrival in District 1 is around 18:00.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0022': buildDetail('GROUP_TOUR', {
    groupAdult: 820000,
    privateAdult: 2200000,
    transportation: 'Air-conditioned minivan and walking',
    mapQuery: '11.1428,106.4614',
    overview: [
      'This half-day tour combines the Cu Chi tunnels with a visit to a traditional rice paper village. You will see how rice paper is made by hand and learn about the family businesses that supply local restaurants.',
      'The tour is a good choice for travellers who want history and local craft in a shorter, relaxed day. Lunch is included at a local restaurant.',
    ],
    highlights: [
      'Explore the Ben Duoc Cu Chi tunnel site',
      'Visit a family-run rice paper village',
      'See the full rice paper making process by hand',
      'Enjoy a local lunch in Cu Chi',
      'Small group with hotel pickup and a local guide',
    ],
    included: [
      'Lunch at a local restaurant',
      'Entrance fees for Cu Chi and the rice paper village',
      'Rice paper tasting',
    ],
    itinerary: [
      {
        stops: [
          ['07:30 - 08:00', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We leave the city and drive to Cu Chi while the guide explains the history of the area.', '10.7769,106.7009'],
          ['09:00', 'Rice paper village', 'Cu Chi, Ho Chi Minh City', 'Visit a family workshop where rice paper is made by hand, from grinding the rice to drying the sheets in the sun.', '10.9667,106.5000'],
          ['10:30', 'Ben Duoc Cu Chi tunnels', 'Ben Duoc, Cu Chi', 'Explore the tunnel network, hidden kitchens and memorial temple at the quieter Ben Duoc site.', '11.1428,106.4614'],
          ['12:30', 'Lunch and return', 'Cu Chi, Ho Chi Minh City', 'Enjoy a local lunch before driving back to the city. Drop-off is around 14:30.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0023': buildDetail('GROUP_TOUR', {
    groupAdult: 3490000,
    privateAdult: 8400000,
    transportation: 'Air-conditioned minivan, boat and bicycle',
    mapQuery: '10.0333,105.7833',
    overview: [
      'This three-day ecotourism tour explores the green side of the Mekong Delta. You will visit fruit orchards, coconut villages, mangrove forests and the Tra Su cajuput forest, with a focus on sustainable local tourism.',
      'The pace is relaxed, with cycling, boat rides and walks. Accommodation is in small local hotels and a garden homestay.',
    ],
    highlights: [
      'Cycle through fruit orchards and coconut villages',
      'Visit Cai Rang floating market and local workshops',
      'Explore the Tra Su flooded forest by boat',
      'Stay in a garden homestay and learn about local cooking',
      'Small group focused on sustainable, community-based tourism',
    ],
    included: [
      'Two nights in local hotels and a garden homestay with breakfast',
      'Five main meals and drinking water',
      'All boat trips, bicycle rental and entrance fees',
      'English-speaking guide and hotel pickup',
    ],
    itinerary: [
      {
        day: 1,
        stops: [
          ['07:30', 'Hotel pickup and drive to Ben Tre', 'District 1, Ho Chi Minh City', 'We drive to Ben Tre, the coconut capital of the delta, while the guide introduces the ecotourism projects we will visit.', '10.2415,106.3758'],
          ['10:00', 'Coconut village and canal boat', 'Ben Tre coconut village', 'Visit a family workshop making coconut oil and candy, then take a small boat through palm-lined canals.', '10.2415,106.3758'],
          ['12:00', 'Lunch in a garden house', 'Ben Tre countryside', 'Enjoy a home-cooked lunch while the host explains how the family grows coconuts, fruit and vegetables.', '10.2350,106.3800'],
          ['14:00', 'Bicycle ride and local ferry', 'Ben Tre countryside', 'Cycle along flat village paths and take a local ferry across the river, with a fruit tasting stop.', '10.2380,106.3780'],
          ['17:00', 'Drive to Can Tho and check in', 'Can Tho city', 'Continue to Can Tho and check in to your hotel. The evening is free to explore the riverfront.', '10.0333,105.7833'],
        ],
      },
      {
        day: 2,
        stops: [
          ['05:30', 'Cai Rang floating market', 'Cai Rang, Can Tho', 'Board a small boat for the floating market at sunrise, then try a local noodle breakfast.', '10.0167,105.7833'],
          ['08:30', 'Rice noodle workshop', 'Cai Rang, Can Tho', 'Visit a family workshop where rice noodles are made by hand and taste a fresh sample.', '10.0200,105.7800'],
          ['10:30', 'Drive to Chau Doc', 'Can Tho to Chau Doc', 'Leave Can Tho and drive west as the landscape changes to rice fields and Khmer villages.', '10.7000,105.1167'],
          ['13:00', 'Lunch and Tra Su forest', 'Tra Su, An Giang', 'Lunch in Chau Doc, then explore the Tra Su flooded forest by rowing boat.', '10.5833,105.0833'],
          ['17:30', 'Sam Mountain sunset and hotel', 'Sam Mountain, Chau Doc', 'Drive up Sam Mountain for sunset, then check in to your hotel and have dinner.', '10.7167,105.0833'],
        ],
      },
      {
        day: 3,
        stops: [
          ['07:00', 'Chau Doc floating village', 'Chau Doc, An Giang', 'Take a short boat trip to the floating fish farms and the Cham village.', '10.7000,105.1167'],
          ['08:30', 'Khmer pagoda and market', 'Chau Doc, An Giang', 'Visit a colourful Khmer pagoda and the local market with your guide.', '10.7000,105.1167'],
          ['10:00', 'Breakfast and check-out', 'Chau Doc, An Giang', 'Return to the hotel for breakfast and check-out before the drive back.', '10.7000,105.1167'],
          ['11:00', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Drive back with a lunch stop on the way. Arrival in District 1 is around 18:00.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0024': buildDetail('GROUP_TOUR', {
    groupAdult: 1050000,
    privateAdult: 2750000,
    transportation: 'Air-conditioned minivan, ferry, boat and walking',
    mapQuery: '10.5083,106.8833',
    overview: [
      'Can Gio is a UNESCO-listed mangrove biosphere reserve just south of Ho Chi Minh City. This full-day tour takes you by ferry and boat into the forest, where you can see monkeys, crocodiles and a remarkable coastal ecosystem.',
      'The tour includes an easy trek, a boat ride through the mangroves and a visit to a local fishing village. It is a great escape from the city for nature lovers.',
    ],
    highlights: [
      'Explore the Can Gio Mangrove Biosphere Reserve',
      'Take a boat ride through the mangrove forest',
      'See monkeys and other wildlife at Monkey Island',
      'Enjoy a seafood lunch at a local restaurant',
      'Easy trek through the forest with a local guide',
    ],
    included: [
      'Lunch at a local restaurant',
      'Ferry crossing, boat ride and entrance fees',
      'Hotel pickup and drop-off in District 1',
    ],
    itinerary: [
      {
        stops: [
          ['07:30 - 08:00', 'Hotel pickup in Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'We drive south to Can Gio, with a short stop at the ferry crossing.', '10.7769,106.7009'],
          ['09:00', 'Ferry to Can Gio', 'Can Gio, Ho Chi Minh City', 'Cross the river by local ferry and enter the Can Gio mangrove forest.', '10.5083,106.8833'],
          ['09:45', 'Mangrove boat ride', 'Can Gio Mangrove Forest', 'Cruise through the mangrove channels and look for crabs, mudskippers and birds among the roots.', '10.5083,106.8833'],
          ['11:00', 'Monkey Island', 'Can Gio, Ho Chi Minh City', 'Visit the monkey island area, home to troops of long-tailed macaques. Keep your belongings close.', '10.5000,106.9000'],
          ['12:30', 'Seafood lunch', 'Can Gio, Ho Chi Minh City', 'Enjoy a local lunch with fresh seafood and Vietnamese dishes.', '10.5083,106.8833'],
          ['13:30', 'Forest trek and local village', 'Can Gio, Ho Chi Minh City', 'Take an easy trek along shaded forest paths and visit a local fishing village.', '10.5083,106.8833'],
          ['16:00 - 18:00', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Take the ferry back and drive to the city. Drop-off at your hotel is around 18:00.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0025': buildDetail('GROUP_TOUR', {
    groupAdult: 1790000,
    privateAdult: 4200000,
    transportation: 'Sleeper bus or private car, depending on the selected option',
    mapQuery: '10.9333,108.2833',
    overview: [
      'This two-day free-and-easy tour takes you from Ho Chi Minh City to Mui Ne, a relaxed beach town known for its long coastline, kitesurfing and seafood. The package includes return transport and one night at a beachside hotel.',
      'You will have the afternoon and evening free to enjoy the beach, try water sports or explore local restaurants. The next morning is also free before the return drive.',
    ],
    highlights: [
      'Return transport from Ho Chi Minh City to Mui Ne',
      'One night at a comfortable beach hotel with breakfast',
      'Free time to swim, relax and explore Mui Ne',
      'Optional kitesurfing, sand dunes and jeep tours',
      'Flexible schedule with no fixed activities',
    ],
    included: [
      'Return transport by sleeper bus or private car',
      'One night at a 3-star beach hotel with breakfast',
      'Hotel pickup and drop-off in District 1',
    ],
    excluded: [
      'Meals other than breakfast',
      'Optional tours and water sports',
      'Personal expenses and drinks',
    ],
    baseServices: false,
    itinerary: [
      {
        day: 1,
        stops: [
          ['07:30', 'Depart Ho Chi Minh City for Mui Ne', 'District 1, Ho Chi Minh City', 'Meet at your hotel or the central pickup point and travel to Mui Ne by sleeper bus or private car.', '10.7769,106.7009'],
          ['11:30', 'Hotel check-in and free afternoon', 'Mui Ne, Phan Thiet', 'Arrive in Mui Ne and check in. The rest of the day is free to swim, walk or book an optional kitesurfing lesson.', '10.9333,108.2833'],
          ['18:30', 'Sunset and dinner', 'Mui Ne beach', 'Enjoy the sunset over the sea and choose from the local seafood restaurants along the coast.', '10.9333,108.2833'],
        ],
      },
      {
        day: 2,
        stops: [
          ['07:00 - 09:00', 'Breakfast and free morning', 'Mui Ne, Phan Thiet', 'Breakfast at the hotel, then free time for a last swim, beach walk or optional sand dunes tour.', '10.9333,108.2833'],
          ['12:00', 'Check-out', 'Mui Ne, Phan Thiet', 'Check out of the hotel and have lunch at your own pace before the return trip.', '10.9333,108.2833'],
          ['13:00', 'Return to Ho Chi Minh City', 'District 1, Ho Chi Minh City', 'Depart Mui Ne and travel back to the city, arriving around 17:30.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0026': buildDetail('GROUP_TOUR', {
    groupAdult: 2490000,
    privateAdult: 5800000,
    transportation: 'Air-conditioned minivan, boat and walking',
    mapQuery: '10.7333,105.5667',
    overview: [
      'This two-day tour explores the less-visited northern Mekong Delta. You will visit Gieng Island, a peaceful farming community, and Tram Chim National Park, one of Vietnam&apos;s most important wetland bird sanctuaries.',
      'The tour is ideal for nature lovers and travellers who have already seen the main delta towns. The pace is slow, with boat rides, village walks and early-morning birdwatching.',
    ],
    highlights: [
      'Visit Gieng Island and cycle through quiet farming villages',
      'Explore Tram Chim National Park by boat',
      'Look for sarus cranes and other rare wetland birds',
      'Stay overnight near the national park',
      'Small group with a local guide and home-cooked meals',
    ],
    included: [
      'One night in a local guesthouse with breakfast',
      'Three main meals and drinking water',
      'Boat trips, bicycle rental and park entrance fees',
      'Hotel pickup and drop-off in District 1',
    ],
    itinerary: [
      {
        day: 1,
        stops: [
          ['07:30', 'Hotel pickup and drive to Gieng Island', 'District 1, Ho Chi Minh City', 'We leave the city early and drive to the Mekong Delta while the guide introduces the northern delta.', '10.7769,106.7009'],
          ['10:30', 'Gieng Island village walk', 'Gieng Island, Tien Giang', 'Walk through the village and meet local families who grow fruit and vegetables on this quiet island.', '10.3333,106.3667'],
          ['12:00', 'Lunch with a local family', 'Gieng Island, Tien Giang', 'Enjoy a home-cooked lunch using ingredients from the family garden and surrounding canals.', '10.3333,106.3667'],
          ['14:00', 'Drive to Tram Chim', 'Tram Chim, Dong Thap', 'Drive north to Tram Chim National Park through rice fields and lotus ponds, then check in to your guesthouse.', '10.7333,105.5667'],
          ['17:00', 'Sunset at the wetland', 'Tram Chim National Park', 'Walk or cycle to the wetland edge for sunset and the first evening bird activity.', '10.7333,105.5667'],
          ['19:00', 'Dinner and free evening', 'Tram Chim, Dong Thap', 'Dinner at the guesthouse with local dishes. The evening is free to relax.', '10.7333,105.5667'],
        ],
      },
      {
        day: 2,
        stops: [
          ['06:00', 'Birdwatching boat trip', 'Tram Chim National Park', 'Leave early by small boat to look for sarus cranes, painted storks and other wetland birds in the morning light.', '10.7333,105.5667'],
          ['08:00', 'Breakfast and check-out', 'Tram Chim, Dong Thap', 'Return to the guesthouse for breakfast and check-out.', '10.7333,105.5667'],
          ['09:00', 'Tram Chim boardwalk and museum', 'Tram Chim National Park', 'Walk the boardwalk through the lotus fields and visit the small visitor centre to learn about the park&apos;s conservation work.', '10.7333,105.5667'],
          ['11:00', 'Lunch and return to Ho Chi Minh City', 'Tram Chim to District 1', 'Enjoy lunch before the drive back to the city. Arrival in District 1 is around 17:00.', '10.7769,106.7009'],
        ],
      },
    ],
  }),

  'TOUR-0027': buildDetail('PRIVATE_TOUR', {
    groupAdult: 1750000,
    privateAdult: 2900000,
    transportation: 'Private air-conditioned car, walking and cyclo',
    mapQuery: '10.7769,106.7009',
    overview: [
      'Make the most of your port day with a private shore excursion from Phu My or Nha Rong port to the highlights of Ho Chi Minh City. Your guide and driver meet you at the port and return you in time for your ship.',
      'The itinerary is flexible and can be adjusted to your interests, from the War Remnants Museum and Reunification Palace to Ben Thanh Market and a local coffee stop.',
    ],
    highlights: [
      'Private guide and vehicle for cruise passengers',
      'Visit the War Remnants Museum and Reunification Palace',
      'See Notre Dame Cathedral and the Central Post Office',
      'Explore Ben Thanh Market and try local coffee',
      'Guaranteed return to the port before your ship departs',
    ],
    included: [
      'Private air-conditioned vehicle and English-speaking guide',
      'Port pickup and drop-off at Phu My or Nha Rong port',
      'All entrance fees listed in the itinerary',
      'Bottled water and a local coffee stop',
    ],
    departureLocation:
      'Pickup at Phu My Port or Nha Rong Port. Please provide your cruise ship name and arrival time when booking.',
    itinerary: [
      {
        stops: [
          ['08:00', 'Pickup at the cruise port', 'Phu My Port or Nha Rong Port', 'Your guide meets you at the port exit with a name board. The drive to Ho Chi Minh City takes about 90 minutes from Phu My, or 15 minutes from Nha Rong.', '10.5083,107.0833'],
          ['09:30', 'War Remnants Museum', 'District 3, Ho Chi Minh City', 'Explore the museum&apos;s exhibitions and military equipment while your guide provides context and answers questions.', '10.7794,106.6922'],
          ['10:45', 'Reunification Palace', 'District 1, Ho Chi Minh City', 'Visit the former presidential palace, preserved as it was in 1975, including the war rooms and reception halls.', '10.7770,106.6958'],
          ['11:45', 'Lunch at a local restaurant', 'District 1, Ho Chi Minh City', 'Enjoy a private lunch with Vietnamese dishes. Vegetarian and dietary requirements can be arranged in advance.', '10.7769,106.7009'],
          ['13:00', 'Ben Thanh Market and local alleys', 'District 1, Ho Chi Minh City', 'Walk through Ben Thanh Market and the surrounding alleys, with time to shop for souvenirs and try a local coffee.', '10.7725,106.6980'],
          ['14:15', 'Notre Dame Cathedral and Central Post Office', 'District 1, Ho Chi Minh City', 'Stop for photos at the cathedral and the Central Post Office before the return drive to the port.', '10.7798,106.6990'],
          ['15:00', 'Return to the cruise port', 'Phu My Port or Nha Rong Port', 'Drive back to the port with a buffer for traffic. The exact return time is agreed with your guide on the day.', '10.5083,107.0833'],
        ],
      },
    ],
  }),
};

export default TOUR_DETAILS;
