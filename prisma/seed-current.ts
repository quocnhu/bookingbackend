import 'dotenv/config';
import {
  AuthProvider,
  DriverType,
  DurationUnit,
  FeeFlowType,
  GuideType,
  PrismaClient,
  RoleType,
  TourType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type SeedPermission = { code: string; name: string; group: string | null };
type SeedRole = {
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
};
type SeedCategory = {
  code: string;
  name: string;
  flowType: FeeFlowType;
  isSystem: boolean;
};
type SeedProvider = { id: string; name: string; isCompany: boolean };
type SeedVehicle = {
  id: string;
  plateNumber: string;
  capacity: number | null;
  brand: string | null;
  providerId: string;
};
type SeedUser = {
  email: string;
  name: string | null;
  role: RoleType;
  userType: string | null;
  providerId: string | null;
  roleNames: string[];
  password: string;
  guide: { type: GuideType; languages: string[]; rating: number } | null;
  driver: {
    licenseNumber: string;
    type: DriverType;
    rating: number;
  } | null;
};
type SeedCoordinate = {
  hotelName: string;
  starRating: string | null;
  address: string;
  coordinate: string | null;
  latitude: number;
  longitude: number;
};
type SeedCompany = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  website: string | null;
  rootLatitude: number | null;
  rootLongitude: number | null;
};
type SeedTour = {
  code: string;
  name: string;
  type: TourType;
  thumbnailUrl: string | null;
  slug: string | null;
  adultPrice: number;
  childPrice: number;
  infantPrice: number;
  currency: string;
  durationDays: number | null;
  durationValue: number | null;
  durationUnit: DurationUnit | null;
  freeCancellationHours: number | null;
  cancellationPolicy: string | null;
  privateDiscountPercent: number | null;
  groupDiscountPercent: number | null;
  promotionStartsAt: string | null;
  promotionEndsAt: string | null;
  departureLocation: string | null;
  departureTimes: string[];
  transportation: string | null;
  overview: string | null;
  includedServices: string | null;
  excludedServices: string | null;
  childrenPolicy: string | null;
  regulations: string | null;
  highlights: string | null;
  insurancePolicy: string | null;
  mapQuery: string | null;
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
    description: string | null;
    timeSlot: string | null;
    location: string | null;
    imageUrl: string | null;
    mapQuery: string | null;
  }>;
  departures: Array<{
    departureDate: string | null;
    adultPrice: number;
    childPrice: number;
    infantPrice: number;
  }>;
  gallery: Array<{ url: string; storageKey: string; sortIndex: number }>;
};

const PERMISSIONS: SeedPermission[] = [
  {
    "code": "accounting.category.create",
    "name": "Tạo danh mục thu/chi",
    "group": "Accounting"
  },
  {
    "code": "accounting.money.reject",
    "name": "Trả lại bảng kê thu/chi",
    "group": "Accounting"
  },
  {
    "code": "accounting.money.verify",
    "name": "Xác minh & khoá tiền chuyến",
    "group": "Accounting"
  },
  {
    "code": "accounting.period.export",
    "name": "Xuất kỳ thanh toán",
    "group": "Accounting"
  },
  {
    "code": "accounting.period.void",
    "name": "Huỷ kỳ thanh toán đã xuất",
    "group": "Accounting"
  },
  {
    "code": "accounting.read",
    "name": "Xem Accounting Room",
    "group": "Accounting"
  },
  {
    "code": "accounting.settlement.create",
    "name": "Thêm khoản thu/chi",
    "group": "Accounting"
  },
  {
    "code": "accounting.settlement.delete",
    "name": "Xoá khoản thu/chi",
    "group": "Accounting"
  },
  {
    "code": "accounting.settlement.update",
    "name": "Sửa khoản thu/chi",
    "group": "Accounting"
  },
  {
    "code": "assignment.create",
    "name": "Tạo assignment",
    "group": "Assignment"
  },
  {
    "code": "assignment.delete",
    "name": "Xoá assignment",
    "group": "Assignment"
  },
  {
    "code": "assignment.read",
    "name": "Xem assignment",
    "group": "Assignment"
  },
  {
    "code": "assignment.tour-report.submit",
    "name": "Nộp báo cáo chuyến đi",
    "group": "Assignment"
  },
  {
    "code": "assignment.update",
    "name": "Sửa assignment",
    "group": "Assignment"
  },
  {
    "code": "audit.read",
    "name": "Xem audit log",
    "group": "System"
  },
  {
    "code": "auth.read",
    "name": "Xem lịch sử đăng nhập",
    "group": "System"
  },
  {
    "code": "booking.create",
    "name": "Tạo booking",
    "group": "Booking"
  },
  {
    "code": "booking.delete",
    "name": "Xoá booking",
    "group": "Booking"
  },
  {
    "code": "booking.note.update",
    "name": "Sửa ghi chú booking của chuyến mình",
    "group": "Assignment"
  },
  {
    "code": "booking.read",
    "name": "Xem booking",
    "group": "Booking"
  },
  {
    "code": "booking.update",
    "name": "Sửa booking",
    "group": "Booking"
  },
  {
    "code": "company.read",
    "name": "Xem hồ sơ công ty",
    "group": "Company"
  },
  {
    "code": "company.update",
    "name": "Cập nhật hồ sơ công ty",
    "group": "Company"
  },
  {
    "code": "coordinate.create",
    "name": "Tạo coordinate",
    "group": "Coordinate"
  },
  {
    "code": "coordinate.delete",
    "name": "Xoá coordinate",
    "group": "Coordinate"
  },
  {
    "code": "coordinate.update",
    "name": "Sửa coordinate",
    "group": "Coordinate"
  },
  {
    "code": "dashboard.read",
    "name": "Xem dashboard",
    "group": "Dashboard"
  },
  {
    "code": "driver.create",
    "name": "Tạo tài xế",
    "group": "Provider Driver"
  },
  {
    "code": "driver.update",
    "name": "Sửa tài xế",
    "group": "Provider Driver"
  },
  {
    "code": "gmail.manage",
    "name": "Quản lý mailbox Gmail",
    "group": "System"
  },
  {
    "code": "provider.create",
    "name": "Tạo transportation provider",
    "group": "Provider"
  },
  {
    "code": "provider-driver.assign",
    "name": "Gán tài xế vào provider",
    "group": "Provider Driver"
  },
  {
    "code": "provider-driver.unassign",
    "name": "Gỡ tài xế khỏi provider",
    "group": "Provider Driver"
  },
  {
    "code": "role.manage",
    "name": "Quản lý role/permission",
    "group": "System"
  },
  {
    "code": "route-price.create",
    "name": "Tạo route price",
    "group": "Route Price"
  },
  {
    "code": "route-price.delete",
    "name": "Xoá route price",
    "group": "Route Price"
  },
  {
    "code": "route-price.update",
    "name": "Sửa route price",
    "group": "Route Price"
  },
  {
    "code": "tour.create",
    "name": "Tạo tour",
    "group": "Tour"
  },
  {
    "code": "tour.delete",
    "name": "Xoá tour",
    "group": "Tour"
  },
  {
    "code": "tour.itinerary.edit",
    "name": "Sửa itinerary tour",
    "group": "Tour"
  },
  {
    "code": "tour.update",
    "name": "Sửa tour",
    "group": "Tour"
  },
  {
    "code": "user.create",
    "name": "Tạo user",
    "group": "User"
  },
  {
    "code": "user.delete",
    "name": "Xoá user",
    "group": "User"
  },
  {
    "code": "user.read",
    "name": "Xem user",
    "group": "User"
  },
  {
    "code": "user.update",
    "name": "Sửa user",
    "group": "User"
  },
  {
    "code": "vehicle.create",
    "name": "Tạo xe (provider)",
    "group": "Vehicle"
  },
  {
    "code": "vehicle.delete",
    "name": "Xoá xe (provider)",
    "group": "Vehicle"
  },
  {
    "code": "vehicle.update",
    "name": "Sửa xe (provider)",
    "group": "Vehicle"
  }
];

const ROLES: SeedRole[] = [
  {
    "name": "ACCOUNTING",
    "description": "Phòng kế toán — kiểm tra, khoá tiền, xuất kỳ thanh toán",
    "isSystem": false,
    "permissions": [
      "accounting.read",
      "accounting.settlement.create",
      "accounting.settlement.update",
      "accounting.settlement.delete",
      "accounting.category.create",
      "accounting.money.verify",
      "accounting.money.reject",
      "accounting.period.export",
      "accounting.period.void"
    ]
  },
  {
    "name": "ADMIN",
    "description": "System administrator",
    "isSystem": true,
    "permissions": [
      "dashboard.read",
      "booking.read",
      "booking.create",
      "booking.update",
      "booking.delete",
      "assignment.read",
      "assignment.create",
      "assignment.update",
      "assignment.delete",
      "booking.note.update",
      "assignment.tour-report.submit",
      "company.read",
      "company.update",
      "tour.create",
      "tour.update",
      "tour.delete",
      "tour.itinerary.edit",
      "user.read",
      "user.create",
      "user.update",
      "user.delete",
      "gmail.manage",
      "role.manage",
      "audit.read",
      "auth.read",
      "coordinate.create",
      "coordinate.update",
      "coordinate.delete",
      "route-price.create",
      "route-price.update",
      "route-price.delete",
      "vehicle.create",
      "vehicle.update",
      "vehicle.delete",
      "provider.create",
      "driver.create",
      "driver.update",
      "provider-driver.assign",
      "provider-driver.unassign",
      "accounting.read",
      "accounting.settlement.create",
      "accounting.settlement.update",
      "accounting.settlement.delete",
      "accounting.category.create",
      "accounting.money.verify",
      "accounting.money.reject",
      "accounting.period.export",
      "accounting.period.void"
    ]
  },
  {
    "name": "OFFICE",
    "description": "Nhân viên văn phòng",
    "isSystem": false,
    "permissions": [
      "dashboard.read",
      "booking.read",
      "booking.create",
      "booking.update",
      "assignment.read",
      "assignment.create",
      "assignment.update",
      "company.read",
      "tour.update",
      "tour.itinerary.edit"
    ]
  },
  {
    "name": "TOUR_GUIDE",
    "description": "Hướng dẫn viên — nộp báo cáo, ghi chú và thu/hoàn tiền của chuyến mình",
    "isSystem": true,
    "permissions": [
      "assignment.tour-report.submit",
      "booking.note.update"
    ]
  },
  {
    "name": "TRANSPORT_PROVIDER",
    "description": "Đối tác vận chuyển — quản lý xe & tài xế của chính nhà xe",
    "isSystem": false,
    "permissions": [
      "assignment.read",
      "assignment.create",
      "vehicle.create",
      "vehicle.update",
      "vehicle.delete",
      "driver.create",
      "driver.update",
      "provider-driver.assign",
      "provider-driver.unassign",
      "route-price.create",
      "route-price.update"
    ]
  }
];

const SETTLEMENT_CATEGORIES: SeedCategory[] = [
  {
    "code": "COLLECT_ON_BEHALF",
    "name": "Thu hộ COD",
    "flowType": "COLLECT_MONEY",
    "isSystem": true
  },
  {
    "code": "CUSTOMER_PAYMENT",
    "name": "Thu tiền khách",
    "flowType": "COLLECT_MONEY",
    "isSystem": true
  },
  {
    "code": "DRIVER_PAY",
    "name": "Lương tài xế",
    "flowType": "PAY_MONEY",
    "isSystem": true
  },
  {
    "code": "FUEL",
    "name": "Nhiên liệu",
    "flowType": "PAY_MONEY",
    "isSystem": true
  },
  {
    "code": "GUIDE_COMMISSION",
    "name": "Hoa hồng HDV",
    "flowType": "COLLECT_MONEY",
    "isSystem": true
  },
  {
    "code": "OTHERS",
    "name": "Khác",
    "flowType": "PAY_MONEY",
    "isSystem": true
  },
  {
    "code": "RESTAURANT",
    "name": "Tiền nhà hàng",
    "flowType": "PAY_MONEY",
    "isSystem": true
  },
  {
    "code": "TOLL_FEE",
    "name": "Phí cầu đường",
    "flowType": "PAY_MONEY",
    "isSystem": true
  },
  {
    "code": "VEHICLE_FEE",
    "name": "Phí xe",
    "flowType": "PAY_MONEY",
    "isSystem": true
  }
];

const PROVIDERS: SeedProvider[] = [
  {
    "id": "demo-company-fleet",
    "name": "Company Fleet",
    "isCompany": true
  },
  {
    "id": "demo-provider",
    "name": "An Phu Transport",
    "isCompany": false
  },
  {
    "id": "prov-hanoi-travel",
    "name": "Hanoi Travel Co.",
    "isCompany": false
  },
  {
    "id": "prov-mekong-v2",
    "name": "Mekong Express",
    "isCompany": false
  }
];

const VEHICLES: SeedVehicle[] = [
  {
    "id": "demo-company-fleet-seat-12",
    "plateNumber": "DEM-12",
    "capacity": 12,
    "brand": "Toyota",
    "providerId": "demo-company-fleet"
  },
  {
    "id": "demo-company-fleet-seat-16",
    "plateNumber": "DEM-16",
    "capacity": 16,
    "brand": "Hyundai",
    "providerId": "demo-company-fleet"
  },
  {
    "id": "demo-company-fleet-seat-29",
    "plateNumber": "DEM-29",
    "capacity": 29,
    "brand": "Samco",
    "providerId": "demo-company-fleet"
  },
  {
    "id": "demo-company-fleet-seat-45",
    "plateNumber": "DEM-45",
    "capacity": 45,
    "brand": "Thaco",
    "providerId": "demo-company-fleet"
  },
  {
    "id": "demo-company-fleet-seat-7",
    "plateNumber": "DEM-7",
    "capacity": 7,
    "brand": "Thaco",
    "providerId": "demo-company-fleet"
  },
  {
    "id": "demo-provider-seat-12",
    "plateNumber": "DEM-12",
    "capacity": 12,
    "brand": "Toyota",
    "providerId": "demo-provider"
  },
  {
    "id": "demo-provider-seat-16",
    "plateNumber": "DEM-16",
    "capacity": 16,
    "brand": "Hyundai",
    "providerId": "demo-provider"
  },
  {
    "id": "demo-provider-seat-29",
    "plateNumber": "DEM-29",
    "capacity": 29,
    "brand": "Samco",
    "providerId": "demo-provider"
  },
  {
    "id": "demo-provider-seat-45",
    "plateNumber": "DEM-45",
    "capacity": 45,
    "brand": "Thaco",
    "providerId": "demo-provider"
  },
  {
    "id": "demo-provider-seat-7",
    "plateNumber": "DEM-7",
    "capacity": 7,
    "brand": "Thaco",
    "providerId": "demo-provider"
  },
  {
    "id": "prov-hanoi-travel-seat-12",
    "plateNumber": "PRO-12",
    "capacity": 12,
    "brand": "Toyota",
    "providerId": "prov-hanoi-travel"
  },
  {
    "id": "prov-hanoi-travel-seat-16",
    "plateNumber": "PRO-16",
    "capacity": 16,
    "brand": "Hyundai",
    "providerId": "prov-hanoi-travel"
  },
  {
    "id": "prov-hanoi-travel-seat-29",
    "plateNumber": "PRO-29",
    "capacity": 29,
    "brand": "Samco",
    "providerId": "prov-hanoi-travel"
  },
  {
    "id": "prov-hanoi-travel-seat-45",
    "plateNumber": "PRO-45",
    "capacity": 45,
    "brand": "Thaco",
    "providerId": "prov-hanoi-travel"
  },
  {
    "id": "prov-hanoi-travel-seat-7",
    "plateNumber": "PRO-7",
    "capacity": 7,
    "brand": "Thaco",
    "providerId": "prov-hanoi-travel"
  },
  {
    "id": "prov-mekong-v2-seat-12",
    "plateNumber": "PRO-12",
    "capacity": 12,
    "brand": "Toyota",
    "providerId": "prov-mekong-v2"
  },
  {
    "id": "prov-mekong-v2-seat-16",
    "plateNumber": "PRO-16",
    "capacity": 16,
    "brand": "Hyundai",
    "providerId": "prov-mekong-v2"
  },
  {
    "id": "prov-mekong-v2-seat-29",
    "plateNumber": "PRO-29",
    "capacity": 29,
    "brand": "Samco",
    "providerId": "prov-mekong-v2"
  },
  {
    "id": "prov-mekong-v2-seat-45",
    "plateNumber": "PRO-45",
    "capacity": 45,
    "brand": "Thaco",
    "providerId": "prov-mekong-v2"
  },
  {
    "id": "prov-mekong-v2-seat-7",
    "plateNumber": "PRO-7",
    "capacity": 7,
    "brand": "Thaco",
    "providerId": "prov-mekong-v2"
  }
];

const USERS: SeedUser[] = [
  {
    "email": "accounting@booking.local",
    "name": "Tran Thi Accounting",
    "role": "OFFICE",
    "userType": "office",
    "providerId": null,
    "roleNames": [
      "ACCOUNTING"
    ],
    "password": "demo123",
    "guide": null,
    "driver": null
  },
  {
    "email": "admin@booking.local",
    "name": "System Admin",
    "role": "ADMIN",
    "userType": "admin",
    "providerId": null,
    "roleNames": [
      "ADMIN"
    ],
    "password": "admin123",
    "guide": null,
    "driver": null
  },
  {
    "email": "anh.guide@booking.local",
    "name": "Pham Van Anh",
    "role": "TOUR_GUIDE",
    "userType": "guide",
    "providerId": null,
    "roleNames": [
      "TOUR_GUIDE"
    ],
    "password": "demo123",
    "guide": {
      "type": "FREELANCE",
      "languages": [
        "English",
        "French"
      ],
      "rating": 4.8
    },
    "driver": null
  },
  {
    "email": "anphu@demo.local",
    "name": "An Phu Transport",
    "role": "TRANSPORT_PROVIDER",
    "userType": "provider",
    "providerId": "demo-provider",
    "roleNames": [
      "TRANSPORT_PROVIDER"
    ],
    "password": "demo123",
    "guide": null,
    "driver": null
  },
  {
    "email": "binh.driver@booking.local",
    "name": "Tran Quoc Binh",
    "role": "DRIVER",
    "userType": "driver",
    "providerId": "demo-company-fleet",
    "roleNames": [],
    "password": "demo123",
    "guide": null,
    "driver": {
      "licenseNumber": "DL-002",
      "type": "COMPANY",
      "rating": 4.8
    }
  },
  {
    "email": "company.fleet@demo.local",
    "name": "Company Fleet",
    "role": "TRANSPORT_PROVIDER",
    "userType": "provider",
    "providerId": "demo-company-fleet",
    "roleNames": [
      "TRANSPORT_PROVIDER"
    ],
    "password": "demo123",
    "guide": null,
    "driver": null
  },
  {
    "email": "customer@booking.local",
    "name": "Nguyen Van Customer",
    "role": "CUSTOMER",
    "userType": "customer",
    "providerId": null,
    "roleNames": [],
    "password": "demo123",
    "guide": null,
    "driver": null
  },
  {
    "email": "hanoi.travel@demo.local",
    "name": "Hanoi Travel Co.",
    "role": "TRANSPORT_PROVIDER",
    "userType": "provider",
    "providerId": "prov-hanoi-travel",
    "roleNames": [
      "TRANSPORT_PROVIDER"
    ],
    "password": "demo123",
    "guide": null,
    "driver": null
  },
  {
    "email": "huong.guide@booking.local",
    "name": "Tran Thi Huong",
    "role": "TOUR_GUIDE",
    "userType": "guide",
    "providerId": null,
    "roleNames": [
      "TOUR_GUIDE"
    ],
    "password": "demo123",
    "guide": {
      "type": "OFFICIAL",
      "languages": [
        "English",
        "Vietnamese"
      ],
      "rating": 5
    },
    "driver": null
  },
  {
    "email": "mai.guide@booking.local",
    "name": "Do Thi Mai",
    "role": "TOUR_GUIDE",
    "userType": "guide",
    "providerId": null,
    "roleNames": [
      "TOUR_GUIDE"
    ],
    "password": "demo123",
    "guide": {
      "type": "OFFICIAL",
      "languages": [
        "English",
        "Chinese"
      ],
      "rating": 4.9
    },
    "driver": null
  },
  {
    "email": "mekong@demo.local",
    "name": "Mekong Express",
    "role": "TRANSPORT_PROVIDER",
    "userType": "provider",
    "providerId": "prov-mekong-v2",
    "roleNames": [
      "TRANSPORT_PROVIDER"
    ],
    "password": "demo123",
    "guide": null,
    "driver": null
  },
  {
    "email": "office@booking.local",
    "name": "Nguyen Thi Office",
    "role": "OFFICE",
    "userType": "office",
    "providerId": null,
    "roleNames": [
      "OFFICE"
    ],
    "password": "demo123",
    "guide": null,
    "driver": null
  },
  {
    "email": "son.driver@booking.local",
    "name": "Le Van Son",
    "role": "DRIVER",
    "userType": "driver",
    "providerId": "demo-provider",
    "roleNames": [],
    "password": "demo123",
    "guide": null,
    "driver": {
      "licenseNumber": "DL-003",
      "type": "FREELANCE",
      "rating": 4.7
    }
  },
  {
    "email": "tai.driver@booking.local",
    "name": "Nguyen Van Tai",
    "role": "DRIVER",
    "userType": "driver",
    "providerId": "demo-company-fleet",
    "roleNames": [],
    "password": "demo123",
    "guide": null,
    "driver": {
      "licenseNumber": "DL-001",
      "type": "COMPANY",
      "rating": 5
    }
  }
];

const COORDINATES: SeedCoordinate[] = [
  {
    "hotelName": "Hotel Indigo Saigon the City",
    "starRating": "5-Star",
    "address": "10-12 Ly Tu Trong Street, Bến Nghé Ward, District 1",
    "coordinate": "10.782418380647256, 106.70518162237182",
    "latitude": 10.78241838,
    "longitude": 106.7051816
  },
  {
    "hotelName": "Me Saigon Boutique Hotel",
    "starRating": "4-Star",
    "address": "10A Ngo Van Nam Street, Bến Nghé Ward, District 1",
    "coordinate": "10.772004287204995, 106.69542506654648",
    "latitude": 10.77200429,
    "longitude": 106.6954251
  },
  {
    "hotelName": "Norfolk Hotel Saigon",
    "starRating": "4-Star",
    "address": "117 Le Thanh Ton Street, Bến Nghé Ward, District 1",
    "coordinate": "10.781194386381777, 106.70404360331285",
    "latitude": 10.78119439,
    "longitude": 106.7040436
  },
  {
    "hotelName": "Hilton Saigon",
    "starRating": "5-Star",
    "address": "11 Me Linh Square, Bến Nghé Ward, District 1",
    "coordinate": "10.775142292936714, 106.70573186418348",
    "latitude": 10.77514229,
    "longitude": 106.7057319
  },
  {
    "hotelName": "Lotus Saigon Hotel",
    "starRating": "4-Star",
    "address": "120 Cach Mang Thang Tam Street, Vo Thi Sau Ward, District 3",
    "coordinate": "10.777225222983027, 106.68344476470186",
    "latitude": 10.77722522,
    "longitude": 106.6834448
  },
  {
    "hotelName": "Hotel Continental Saigon",
    "starRating": "4-Star",
    "address": "132-134 Dong Khoi Street, Bến Nghé Ward, District 1",
    "coordinate": "10.777116221082213, 106.70242739169196",
    "latitude": 10.77711622,
    "longitude": 106.7024274
  },
  {
    "hotelName": "Rex Hotel Saigon",
    "starRating": "5-Star",
    "address": "141 Nguyen Hue Boulevard, Bến Nghé Ward, District 1",
    "coordinate": "10.775679482475697, 106.70125106771009",
    "latitude": 10.77567948,
    "longitude": 106.7012511
  },
  {
    "hotelName": "Pullman Saigon Centre",
    "starRating": "5-Star",
    "address": "148 Tran Hung Dao Boulevard, Nguyễn Cư Trinh Ward, District 1",
    "coordinate": "10.764453569949664, 106.69172433771139",
    "latitude": 10.76445357,
    "longitude": 106.6917243
  },
  {
    "hotelName": "The Rivergate Apartments & Condo",
    "starRating": "4-Star Res.",
    "address": "151-155 Ben Van Don Street, Ward 6, District 4",
    "coordinate": "10.762624045757978, 106.69883981198151",
    "latitude": 10.76262405,
    "longitude": 106.6988398
  },
  {
    "hotelName": "Mai House Saigon",
    "starRating": "5-Star",
    "address": "157 Ngô Thời Nhiệm Street, Vo Thi Sau Ward, District 3",
    "coordinate": "10.78238983547188, 106.69166682237184",
    "latitude": 10.78238984,
    "longitude": 106.6916668
  },
  {
    "hotelName": "Renaissance Riverside Hotel Saigon",
    "starRating": "5-Star",
    "address": "15 Ton Duc Thang Street, Bến Nghé Ward, District 1",
    "coordinate": "10.774600243541904, 106.70613707819693",
    "latitude": 10.77460024,
    "longitude": 106.7061371
  },
  {
    "hotelName": "Liberty Central Saigon Centre",
    "starRating": "4-Star",
    "address": "179 Le Thanh Ton Street, Bến Thành Ward, District 1",
    "coordinate": "10.773626845951153, 106.69866170994774",
    "latitude": 10.77362685,
    "longitude": 106.6986617
  },
  {
    "hotelName": "Sofitel Saigon Plaza",
    "starRating": "5-Star",
    "address": "17 Le Duan Boulevard, Bến Nghé Ward, District 1",
    "coordinate": "10.784220219056389, 106.70267150887672",
    "latitude": 10.78422022,
    "longitude": 106.7026715
  },
  {
    "hotelName": "Liberty Central Saigon Riverside Hotel",
    "starRating": "4-Star",
    "address": "17 Tôn Đức Thắng, Sài Gòn, Hồ Chí Minh, Vietnam",
    "coordinate": "10.774123393043046, 106.70621286583302",
    "latitude": 10.77412339,
    "longitude": 106.7062129
  },
  {
    "hotelName": "Liberty Central Saigon Riverside",
    "starRating": "4-Star",
    "address": "17 Ton Duc Thang Street, Bến Nghé Ward, District 1",
    "coordinate": "10.77428114088544, 106.70618177754167",
    "latitude": 10.77428114,
    "longitude": 106.7061818
  },
  {
    "hotelName": "La Siesta Premium Saigon",
    "starRating": "5-Star",
    "address": "180 Ly Tu Trong Street, Bến Thành Ward, District 1",
    "coordinate": "10.773242725217457, 106.69576572237169",
    "latitude": 10.77324273,
    "longitude": 106.6957657
  },
  {
    "hotelName": "Adora Art Hotel",
    "starRating": "3/4-Star",
    "address": "189-191 Ly Tu Trong Street, Bến Thành Ward, District 1",
    "coordinate": "10.773332223867628, 106.6960683223716",
    "latitude": 10.77333222,
    "longitude": 106.6960683
  },
  {
    "hotelName": "Windsor Plaza Hotel",
    "starRating": "5-Star",
    "address": "18 An Duong Vuong Street, Ward 9, District 5",
    "coordinate": "10.75811925725289, 106.67364974509029",
    "latitude": 10.75811926,
    "longitude": 106.6736497
  },
  {
    "hotelName": "Caravelle Saigon",
    "starRating": "5-Star",
    "address": "19-23 Lam Son Square, Bến Nghé Ward, District 1",
    "coordinate": "10.776372964927795, 106.70359243887397",
    "latitude": 10.77637296,
    "longitude": 106.7035924
  },
  {
    "hotelName": "Hotel Majestic Saigon",
    "starRating": "5-Star",
    "address": "1 Dong Khoi Street, Bến Nghé Ward, District 1",
    "coordinate": "10.773022267911015, 106.70607100511634",
    "latitude": 10.77302227,
    "longitude": 106.706071
  },
  {
    "hotelName": "The Reverie Saigon Hotel",
    "starRating": "5-Star",
    "address": "22-36 Nguyen Hue Boulevard, Bến Nghé Ward, District 1",
    "coordinate": "10.773719043009333, 106.7046466919225",
    "latitude": 10.77371904,
    "longitude": 106.7046467
  },
  {
    "hotelName": "Equatorial Hotel HCMC",
    "starRating": "5-Star",
    "address": "242 Tran Binh Trong Street, Ward 4, District 5",
    "coordinate": "10.763285791165945, 106.67920053771137",
    "latitude": 10.76328579,
    "longitude": 106.6792005
  },
  {
    "hotelName": "Calista Saigon Hotel",
    "starRating": "3-Star",
    "address": "247 Ly Tu Trong Street, Bến Thành Ward, District 1",
    "coordinate": "10.772513304010436, 106.69493260887653",
    "latitude": 10.7725133,
    "longitude": 106.6949326
  },
  {
    "hotelName": "A25 Hotel - Ly Tu Trong",
    "starRating": "2-Star",
    "address": "251 Ly Tu Trong Street, Bến Thành Ward, District 1",
    "coordinate": "10.771721546480364, 106.69400015120657",
    "latitude": 10.77172155,
    "longitude": 106.6940002
  },
  {
    "hotelName": "Nicecy Boutique Hotel",
    "starRating": "3-Star",
    "address": "27-29 Le Thanh Ton Street, Bến Thành Ward, District 1",
    "coordinate": "10.771934505528206, 106.69618028004163",
    "latitude": 10.77193451,
    "longitude": 106.6961803
  },
  {
    "hotelName": "La Vela Saigon Hotel",
    "starRating": "5-Star",
    "address": "280 Nam Ky Khoi Nghia Street, Vo Thi Sau Ward, District 3",
    "coordinate": "10.788838455658771, 106.68551588004182",
    "latitude": 10.78883846,
    "longitude": 106.6855159
  },
  {
    "hotelName": "Silverland Mây Hotel",
    "starRating": "4-Star",
    "address": "28 Thi Sach Street, Bến Nghé Ward, District 1",
    "coordinate": "10.77934901943819, 106.7040035223718",
    "latitude": 10.77934902,
    "longitude": 106.7040035
  },
  {
    "hotelName": "Lotte Hotel Saigon",
    "starRating": "5-Star",
    "address": "2A-4A Ton Duc Thang Street, Bến Nghé Ward, District 1",
    "coordinate": "10.778779603467044, 106.70687105305151",
    "latitude": 10.7787796,
    "longitude": 106.7068711
  },
  {
    "hotelName": "Park Hyatt Saigon",
    "starRating": "5-Star",
    "address": "2 Lam Son Square, Bến Nghé Ward, District 1",
    "coordinate": "10.777639169459526, 106.70337774413669",
    "latitude": 10.77763917,
    "longitude": 106.7033777
  },
  {
    "hotelName": "JW Marriott Hotel & Suites Saigon",
    "starRating": "5-Star",
    "address": "39 Le Duan Boulevard, Bến Nghé Ward, District 1",
    "coordinate": "10.78099658590943, 106.70042342881965",
    "latitude": 10.78099659,
    "longitude": 106.7004234
  },
  {
    "hotelName": "Le Méridien Saigon",
    "starRating": "5-Star",
    "address": "3C Ton Duc Thang Street, Bến Nghé Ward, District 1",
    "coordinate": "10.780146521343454, 106.70727543586693",
    "latitude": 10.78014652,
    "longitude": 106.7072754
  },
  {
    "hotelName": "Adora Hotel Bến Thành",
    "starRating": "3/4-Star",
    "address": "42-44 Thu Khoa Huan Street, Bến Thành Ward, District 1",
    "coordinate": "10.773305331158712, 106.6960601843129",
    "latitude": 10.77330533,
    "longitude": 106.6960602
  },
  {
    "hotelName": "Silverland Jolie Hotel",
    "starRating": "4-Star",
    "address": "4D Thi Sach Street, Bến Nghé Ward, District 1",
    "coordinate": "10.777421562469007, 106.7058827512067",
    "latitude": 10.77742156,
    "longitude": 106.7058828
  },
  {
    "hotelName": "Roseland Sweet Hotel",
    "starRating": "3-Star",
    "address": "4M-4N Le Thanh Ton Street, Bến Nghé Ward, District 1",
    "coordinate": "10.778931922025222, 106.70480173586692",
    "latitude": 10.77893192,
    "longitude": 106.7048017
  },
  {
    "hotelName": "Grand Cititel Central Saigon",
    "starRating": "3-Star",
    "address": "53-55 Lê Anh Xuân, Bến Thành, Hồ Chí Minh, Vietnam",
    "coordinate": "10.772211269943925, 106.69497472862041",
    "latitude": 10.77221127,
    "longitude": 106.6949747
  },
  {
    "hotelName": "The Hammock Hotel Fine Arts",
    "starRating": "3-Star",
    "address": "59-61 Nguyen Thai Binh Street, Nguyễn Thái Bình Ward, District 1",
    "coordinate": "10.769703427202588, 106.7001760070317",
    "latitude": 10.76970343,
    "longitude": 106.700176
  },
  {
    "hotelName": "Liberty Central Saigon Citypoint",
    "starRating": "4-Star",
    "address": "59 Pasteur Street, Bến Nghé Ward, District 1",
    "coordinate": "10.774822003706264, 106.7007450107213",
    "latitude": 10.774822,
    "longitude": 106.700745
  },
  {
    "hotelName": "Fusion Original Saigon Centre",
    "starRating": "5-Star",
    "address": "65 Le Loi Boulevard, Bến Thành Ward, District 1",
    "coordinate": "10.773749004383333, 106.70126322237161",
    "latitude": 10.773749,
    "longitude": 106.7012632
  },
  {
    "hotelName": "Oscar Saigon Hotel",
    "starRating": "3-Star",
    "address": "68A Nguyen Hue Boulevard, Bến Nghé Ward, District 1",
    "coordinate": "10.774938405219002, 106.70325782052689",
    "latitude": 10.77493841,
    "longitude": 106.7032578
  },
  {
    "hotelName": "The Myst Dong Khoi",
    "starRating": "5-Star",
    "address": "6-8 Ho Huan Nghiep Street, Bến Nghé Ward, District 1",
    "coordinate": "10.775024025643665, 106.70538752379258",
    "latitude": 10.77502403,
    "longitude": 106.7053875
  },
  {
    "hotelName": "Silverland Yen Hotel",
    "starRating": "4-Star",
    "address": "73-75 Huyen Tran Cong Chua, Bến Thành Ward, District 1",
    "coordinate": "10.774875084616717, 106.69628030887654",
    "latitude": 10.77487508,
    "longitude": 106.6962803
  },
  {
    "hotelName": "Wink Hotel Saigon Center",
    "starRating": "4-Star",
    "address": "75 Nguyen Binh Khiem Street, Đa Kao Ward, District 1",
    "coordinate": "10.791409175912486, 106.70048419353702",
    "latitude": 10.79140918,
    "longitude": 106.7004842
  },
  {
    "hotelName": "Hotel Des Arts Saigon MGallery",
    "starRating": "5-Star",
    "address": "76-78 Nguyen Thi Minh Khai, Vo Thi Sau Ward, District 3",
    "coordinate": "10.78267187757719, 106.6972783935369",
    "latitude": 10.78267188,
    "longitude": 106.6972784
  },
  {
    "hotelName": "New World Saigon Hotel",
    "starRating": "5-Star",
    "address": "76 Le Lai Street, Bến Thành Ward, District 1",
    "coordinate": "10.771029986639055, 106.69521115120658",
    "latitude": 10.77102999,
    "longitude": 106.6952112
  },
  {
    "hotelName": "Bay Hotel Ho Chi Minh",
    "starRating": "4-Star",
    "address": "7 Ngo Van Nam Street, Bến Nghé Ward, District 1",
    "coordinate": "10.780839799907609, 106.70693576654664",
    "latitude": 10.7808398,
    "longitude": 106.7069358
  },
  {
    "hotelName": "Au Lac Charner Hotel",
    "starRating": "4-Star",
    "address": "87-89-91 Ham Nghi Boulevard, Bến Nghé Ward, District 1",
    "coordinate": "10.772314705288313, 106.70349280703176",
    "latitude": 10.77231471,
    "longitude": 106.7034928
  },
  {
    "hotelName": "Sheraton Saigon Grand Opera",
    "starRating": "5-Star",
    "address": "88 Dong Khoi Street, Bến Nghé Ward, District 1",
    "coordinate": "10.775497062861001, 106.70388336899461",
    "latitude": 10.77549706,
    "longitude": 106.7038834
  },
  {
    "hotelName": "Muong Thanh Grand Saigon Centre",
    "starRating": "4-Star",
    "address": "8A Nguyen Sieu Street, Bến Nghé Ward, District 1",
    "coordinate": "10.784383837022574, 106.70053636470202",
    "latitude": 10.78438384,
    "longitude": 106.7005364
  },
  {
    "hotelName": "Hotel Grand Saigon",
    "starRating": "5-Star",
    "address": "8 Dong Khoi Street, Bến Nghé Ward, District 1",
    "coordinate": "10.774234713441915, 106.70534547460785",
    "latitude": 10.77423471,
    "longitude": 106.7053455
  }
];

const COMPANY: SeedCompany | null = {
  "name": "SunShine Travel & Transportation Co., Ltd.",
  "address": "88 Bach Dang Street, Hai Chau District, Da Nang, Vietnam",
  "phone": "+84 236 3888 999",
  "email": "hello@sunshine-travel.vn",
  "taxId": "0317412086",
  "website": "https://sunshine-travel.vn",
  "rootLatitude": 10.76557640959363,
  "rootLongitude": 106.7041104542182
};

const SETTINGS: Array<{ key: string; value: string }> = [
  {
    "key": "assignMode",
    "value": "AUTO_ASSIGN"
  }
];

const TOURS: SeedTour[] = [
  {
    "code": "TOUR-0001",
    "name": "Mekong Delta Small Group Tour with Vinh Trang Pagoda",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0002",
    "name": "Cu Chi Ben Duoc Tunnels: Authentic & Less Touristy",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0003",
    "name": "Private Airport Transfer Service Ho Chi Minh City",
    "type": "PRIVATE_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0004",
    "name": "5-Hour Sunrise or Sunset Jeep Tour from Mui Ne",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 5,
    "durationUnit": "HOUR",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "05:00",
      "15:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0005",
    "name": "Cu Chi & Mekong Delta Premium Small Group 1-Day (Max 10)",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0006",
    "name": "Australian Base, Long Tan & Nui Dat Tour with Vung Tau Beach",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0007",
    "name": "2-Day Trekking & Biking Nam Cat Tien National Park from HCM City",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 2,
    "durationValue": 2,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0008",
    "name": "1-Day Mekong Delta Tour: Less-Touristy Cai Be & Vinh Long (Max 10)",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0009",
    "name": "Exploring Saigon by Scooter, Day or Night",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0010",
    "name": "1-Day Ho Chi Minh City & Cu Chi Tunnels - Deluxe Group Of 10 Max",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0011",
    "name": "Cu Chi Tunnels and Tan Lap Floating Village Day Tour",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0012",
    "name": "2-Day Cu Chi Tunnels & Mekong Delta - Cai Rang Floating Market",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 2,
    "durationValue": 2,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0013",
    "name": "1-Day Explore Non-Touristy Side Of Mekong Delta - Group 10 Max",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0014",
    "name": "Cu Chi-Ben Duoc Tunnels & War Remnants Museum – Small Group",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0015",
    "name": "Premium Small Group Cu Chi Less Crowded Site and Mekong Delta",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0016",
    "name": "2-Day Mekong Delta with Cai Rang Floating Market from HCM City",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 2,
    "durationValue": 2,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0017",
    "name": "1-Day Cai Rang Floating Market-Biking & Cu Chi Tunnel Trip",
    "type": "GROUP_TOUR",
    "thumbnailUrl": "data:image/jpeg;base64,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",
    "slug": "1-day-cai-rang-floating-market-biking-cu-chi-tunnel-trip",
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": "",
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [
      {
        "type": "PRIVATE_TOUR",
        "adultPrice": 0,
        "childPrice": 0,
        "infantPrice": 0,
        "currency": "VND"
      },
      {
        "type": "GROUP_TOUR",
        "adultPrice": 0,
        "childPrice": 0,
        "infantPrice": 0,
        "currency": "VND"
      }
    ],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0018",
    "name": "2-Day Cu Chi Tunnels – Mekong Delta Cai Be-Vinh Long (Homestay)",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 2,
    "durationValue": 2,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0019",
    "name": "Cai Rang Floating Market, Vinh Long & Cai Be Full-Day Tour",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0020",
    "name": "Cu Chi Tunnels & Mekong Delta 2-Day Tour",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 2,
    "durationValue": 2,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0021",
    "name": "3-Day Mekong Delta Adventure: My Tho, Can Tho & Chau Doc",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 3,
    "durationValue": 3,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0022",
    "name": "Cu Chi Ben Duoc Tunnels & Rice Paper Village with Lunch",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0023",
    "name": "3-Day Best Ecotourism Experiences in Mekong Delta from HCM City",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 3,
    "durationValue": 3,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0024",
    "name": "1-Day Can Gio Island-Mangrove Biosphere Reserve-Trekking",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0025",
    "name": "2-Day Free & Easy Mui Ne Beach Tour from Ho Chi Minh City",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 2,
    "durationValue": 2,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0026",
    "name": "2-Day Mekong Delta: Gieng Island & Tram Chim National Park",
    "type": "GROUP_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 2,
    "durationValue": 2,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  },
  {
    "code": "TOUR-0027",
    "name": "Private Ho Chi Minh City Shore Excursion for Cruise Passengers",
    "type": "PRIVATE_TOUR",
    "thumbnailUrl": null,
    "slug": null,
    "adultPrice": 0,
    "childPrice": 0,
    "infantPrice": 0,
    "currency": "VND",
    "durationDays": 1,
    "durationValue": 1,
    "durationUnit": "DAY",
    "freeCancellationHours": 24,
    "cancellationPolicy": null,
    "privateDiscountPercent": 0,
    "groupDiscountPercent": 0,
    "promotionStartsAt": null,
    "promotionEndsAt": null,
    "departureLocation": null,
    "departureTimes": [
      "08:00",
      "13:00"
    ],
    "transportation": null,
    "overview": null,
    "includedServices": null,
    "excludedServices": null,
    "childrenPolicy": null,
    "regulations": null,
    "highlights": null,
    "insurancePolicy": null,
    "mapQuery": null,
    "typePrices": [],
    "itineraries": [],
    "departures": [],
    "gallery": []
  }
];

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const demoHash = await bcrypt.hash('demo123', 10);

  const permissionByCode = new Map<string, string>();
  for (const permission of PERMISSIONS) {
    const row = await prisma.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name, group: permission.group },
      create: permission,
    });
    permissionByCode.set(row.code, row.id);
  }

  for (const role of ROLES) {
    const saved = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, isSystem: role.isSystem },
      create: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: saved.id } });
    const ids = role.permissions
      .map((code) => permissionByCode.get(code))
      .filter((id): id is string => Boolean(id));
    if (ids.length > 0) {
      await prisma.rolePermission.createMany({
        data: ids.map((permissionId) => ({ roleId: saved.id, permissionId })),
        skipDuplicates: true,
      });
    }
  }

  for (const category of SETTLEMENT_CATEGORIES) {
    await prisma.settlementCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        flowType: category.flowType,
        isSystem: category.isSystem,
      },
      create: category,
    });
  }

  for (const provider of PROVIDERS) {
    await prisma.transportationProvider.upsert({
      where: { id: provider.id },
      update: { name: provider.name, isCompany: provider.isCompany },
      create: provider,
    });
  }

  for (const vehicle of VEHICLES) {
    await prisma.vehicle.upsert({
      where: { id: vehicle.id },
      update: {
        plateNumber: vehicle.plateNumber,
        capacity: vehicle.capacity,
        brand: vehicle.brand,
        providerId: vehicle.providerId,
      },
      create: vehicle,
    });
  }

  const roleByName = new Map(
    (await prisma.role.findMany({ select: { id: true, name: true } })).map(
      (role) => [role.name, role.id],
    ),
  );

  for (const user of USERS) {
    const passwordHash =
      user.password === 'admin123' ? adminHash : demoHash;
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        userType: user.userType,
        providerId: user.providerId,
        isActive: true,
        authProvider: AuthProvider.LOCAL,
      },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        role: user.role,
        userType: user.userType,
        providerId: user.providerId,
        isActive: true,
        authProvider: AuthProvider.LOCAL,
      },
    });

    await prisma.userRole.deleteMany({ where: { userId: saved.id } });
    const roleIds = user.roleNames
      .map((name) => roleByName.get(name))
      .filter((id): id is string => Boolean(id));
    if (roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: saved.id, roleId })),
        skipDuplicates: true,
      });
    }

    if (user.guide) {
      await prisma.guideProfile.upsert({
        where: { userId: saved.id },
        update: user.guide,
        create: { userId: saved.id, ...user.guide },
      });
    }
    if (user.driver) {
      await prisma.driverProfile.upsert({
        where: { userId: saved.id },
        update: user.driver,
        create: { userId: saved.id, ...user.driver },
      });
    }
  }

  for (const coordinate of COORDINATES) {
    await prisma.coordinate.upsert({
      where: { address: coordinate.address },
      update: coordinate,
      create: coordinate,
    });
  }

  if (COMPANY) {
    const existing = await prisma.companyProfile.findFirst();
    if (existing) {
      await prisma.companyProfile.update({
        where: { id: existing.id },
        data: COMPANY,
      });
    } else {
      await prisma.companyProfile.create({ data: COMPANY });
    }
  }

  for (const setting of SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  for (const tour of TOURS) {
    const { typePrices, itineraries, departures, gallery, ...tourData } = tour;
    const saved = await prisma.tour.upsert({
      where: { code: tour.code },
      update: tourData,
      create: tourData,
    });

    for (const price of typePrices) {
      await prisma.tourTypePrice.upsert({
        where: { tourId_type: { tourId: saved.id, type: price.type } },
        update: {
          adultPrice: price.adultPrice,
          childPrice: price.childPrice,
          infantPrice: price.infantPrice,
          currency: price.currency,
        },
        create: { tourId: saved.id, ...price },
      });
    }

    await prisma.tourItinerary.deleteMany({ where: { tourId: saved.id } });
    if (itineraries.length > 0) {
      await prisma.tourItinerary.createMany({
        data: itineraries.map((item) => ({ ...item, tourId: saved.id })),
      });
    }

    await prisma.tourDeparture.deleteMany({ where: { tourId: saved.id } });
    if (departures.length > 0) {
      await prisma.tourDeparture.createMany({
        data: departures.map((item) => ({
          ...item,
          departureDate: new Date(item.departureDate ?? Date.now()),
          tourId: saved.id,
        })),
      });
    }

    await prisma.tourGallery.deleteMany({ where: { tourId: saved.id } });
    if (gallery.length > 0) {
      await prisma.tourGallery.createMany({
        data: gallery.map((item) => ({ ...item, tourId: saved.id })),
      });
    }
  }

  console.log(
    `✅ Seeded ${PERMISSIONS.length} permissions, ${ROLES.length} roles, ${USERS.length} users, ${TOURS.length} tours`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
