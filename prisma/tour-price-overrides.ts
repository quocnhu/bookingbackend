export type TourPriceOverride = {
  name: string;
  priceFromVnd: number;
};

// "price from" is the advertised starting price in VND for the group adult
// ticket. Child, infant and private prices stay at 0 until supplied.
export const TOUR_PRICE_OVERRIDES: Record<string, TourPriceOverride> = {
  'TOUR-0002': {
    name: 'Cu Chi Ben Duoc Tunnels: Authentic & Less Touristy',
    priceFromVnd: 494000,
  },
  'TOUR-0001': {
    name: 'Mekong Delta Small Group Tour with Vinh Trang Pagoda',
    priceFromVnd: 702000,
  },
  'TOUR-0003': {
    name: 'Private Airport Transfer Service Ho Chi Minh City',
    priceFromVnd: 416000,
  },
  'TOUR-0004': {
    name: 'Mui Ne: Small-Group Sunrise or Sunset Sand Dunes Jeep Tour',
    priceFromVnd: 364000,
  },
  'TOUR-0007': {
    name: '2-Day Trekking & Biking Nam Cat Tien National Park from HCM City',
    priceFromVnd: 8294000,
  },
  'TOUR-0005': {
    name: 'Cu Chi & Mekong Delta Premium Small Group 1-Day (Max 10)',
    priceFromVnd: 520000,
  },
  'TOUR-0006': {
    name: 'Australian Base, Long Tan & Nui Dat Tour with Vung Tau Beach',
    priceFromVnd: 2730000,
  },
  'TOUR-0008': {
    name: '1-Day Mekong Delta Tour: Less-Touristy Cai Be & Vinh Long(Max 10)',
    priceFromVnd: 910000,
  },
  'TOUR-0010': {
    name: '1-Day Ho Chi Minh City & Cu Chi Tunnels-Deluxe Group Of 10 Max',
    priceFromVnd: 1430000,
  },
  'TOUR-0014': {
    name: 'Cu Chi-Ben Duoc Tunnels & War Remnants Museum – Small Group',
    priceFromVnd: 702000,
  },
  'TOUR-0012': {
    name: '2-Day Cu Chi Tunnels & Mekong Delta - Cai Rang Floating Market',
    priceFromVnd: 8320000,
  },
  'TOUR-0011': {
    name: 'Cu Chi Tunnels and Tan Lap Floating Village Day Tour',
    priceFromVnd: 2496000,
  },
  'TOUR-0013': {
    name: '1-Day Explore Non-Touristy Side Of Mekong Delta- Group 10 Max',
    priceFromVnd: 3380000,
  },
  'TOUR-0018': {
    name: '2-Day Cu Chi Tunnels – Mekong Delta Cai Be-Vinh Long (Homestay)',
    priceFromVnd: 6240000,
  },
  'TOUR-0016': {
    name: '2-Day Mekong Delta with Cai Cang Floating Market from HCM City',
    priceFromVnd: 6370000,
  },
  'TOUR-0015': {
    name: 'Premium Small Group Cu Chi Less Crowded Site and Mekong Delta',
    priceFromVnd: 1300000,
  },
  'TOUR-0022': {
    name: 'Cu Chi Ben Duoc Tunnels & Rice Paper Village with Lunch',
    priceFromVnd: 520000,
  },
  'TOUR-0017': {
    name: '1-Day Cai Rang Floating Market-Biking & Cu Chi Tunnel Trip',
    priceFromVnd: 5382000,
  },
  'TOUR-0021': {
    name: '3-Day Mekong Delta Adventure: My Tho, Can Tho & Chau Doc',
    priceFromVnd: 8840000,
  },
  'TOUR-0020': {
    name: 'Cu Chi Tunnels & Mekong Delta 2-Day Tour',
    priceFromVnd: 7930000,
  },
  'TOUR-0019': {
    name: 'Cai Rang Floating Market, Vinh Long & Cai Be Full-Day Tour',
    priceFromVnd: 5330000,
  },
  'TOUR-0009': {
    name: 'Exploring Saigon by Scooter, Day or Night',
    priceFromVnd: 936000,
  },
  'TOUR-0024': {
    name: '1-Day Can Gio Island-Mangrove Biosphere Reserve-Trekking',
    priceFromVnd: 2236000,
  },
  'TOUR-0026': {
    name: '2-Day Mekong Delta: Gieng Island & Tram Chim National Park',
    priceFromVnd: 9490000,
  },
};
