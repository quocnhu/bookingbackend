"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HotelsService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const HOTEL_ROLE_NAME = 'HOTEL';
let HotelsService = class HotelsService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async list() {
        const hotels = await this.prisma.hotel.findMany({
            orderBy: { name: 'asc' },
            include: {
                users: {
                    select: { id: true, email: true, name: true, isActive: true },
                },
                _count: { select: { bookings: true } },
            },
        });
        return hotels.map((hotel) => ({
            ...hotel,
            commissionPercent: Number(hotel.commissionPercent),
            bookingsCount: hotel._count.bookings,
        }));
    }
    async publicList() {
        return this.prisma.hotel.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, address: true },
        });
    }
    async create(dto, actor) {
        const name = dto.name.trim();
        const existing = await this.prisma.hotel.findUnique({ where: { name } });
        if (existing) {
            throw new common_1.ConflictException('A hotel with this name already exists');
        }
        if (dto.accountPassword && !dto.accountEmail) {
            throw new common_1.BadRequestException('An account email is required when setting a password');
        }
        if (dto.accountEmail) {
            const taken = await this.prisma.user.findUnique({
                where: { email: dto.accountEmail.trim() },
            });
            if (taken) {
                throw new common_1.ConflictException('This account email is already in use');
            }
        }
        const hotel = await this.prisma.$transaction(async (tx) => {
            const created = await tx.hotel.create({
                data: {
                    name,
                    contactName: dto.contactName?.trim() || null,
                    phone: dto.phone?.trim() || null,
                    email: dto.email?.trim() || null,
                    address: dto.address?.trim() || null,
                    commissionPercent: new client_1.Prisma.Decimal(dto.commissionPercent ?? 0),
                    isActive: dto.isActive ?? true,
                },
            });
            if (dto.accountEmail && dto.accountPassword) {
                await tx.role.upsert({
                    where: { name: HOTEL_ROLE_NAME },
                    update: {},
                    create: {
                        name: HOTEL_ROLE_NAME,
                        description: 'Hotel partner — own bookings and commission',
                    },
                });
                await tx.user.create({
                    data: {
                        email: dto.accountEmail.trim(),
                        name: dto.accountName?.trim() || created.contactName || created.name,
                        passwordHash: await bcrypt.hash(dto.accountPassword, 10),
                        role: client_1.RoleType.HOTEL,
                        hotelId: created.id,
                        isActive: created.isActive,
                    },
                });
            }
            return created;
        });
        await this.audit.log({
            entityType: 'Hotel',
            entityId: hotel.id,
            action: 'CREATE_HOTEL',
            afterData: { ...hotel, accountEmail: dto.accountEmail ?? null },
            changedBy: actor.id,
        });
        return this.findOne(hotel.id);
    }
    async update(id, dto, actor) {
        const before = await this.prisma.hotel.findUnique({
            where: { id },
            include: { users: { select: { id: true, email: true } } },
        });
        if (!before)
            throw new common_1.NotFoundException('Hotel not found');
        if (dto.name && dto.name.trim() !== before.name) {
            const clash = await this.prisma.hotel.findUnique({
                where: { name: dto.name.trim() },
            });
            if (clash) {
                throw new common_1.ConflictException('A hotel with this name already exists');
            }
        }
        if (dto.accountPassword && !dto.accountEmail && before.users.length === 0) {
            throw new common_1.BadRequestException('An account email is required when setting a password');
        }
        const account = before.users[0];
        if (dto.accountEmail) {
            const normalized = dto.accountEmail.trim();
            if (!account) {
                const taken = await this.prisma.user.findUnique({
                    where: { email: normalized },
                });
                if (taken) {
                    throw new common_1.ConflictException('This account email is already in use');
                }
            }
            else if (normalized !== account.email) {
                const taken = await this.prisma.user.findUnique({
                    where: { email: normalized },
                });
                if (taken) {
                    throw new common_1.ConflictException('This account email is already in use');
                }
            }
        }
        const hotel = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.hotel.update({
                where: { id },
                data: {
                    name: dto.name?.trim(),
                    contactName: dto.contactName !== undefined
                        ? dto.contactName.trim() || null
                        : undefined,
                    phone: dto.phone !== undefined ? dto.phone.trim() || null : undefined,
                    email: dto.email !== undefined ? dto.email.trim() || null : undefined,
                    address: dto.address !== undefined ? dto.address.trim() || null : undefined,
                    commissionPercent: dto.commissionPercent !== undefined
                        ? new client_1.Prisma.Decimal(dto.commissionPercent)
                        : undefined,
                    isActive: dto.isActive,
                },
            });
            if (dto.accountEmail && dto.accountPassword) {
                await tx.role.upsert({
                    where: { name: HOTEL_ROLE_NAME },
                    update: {},
                    create: {
                        name: HOTEL_ROLE_NAME,
                        description: 'Hotel partner — own bookings and commission',
                    },
                });
                const passwordHash = await bcrypt.hash(dto.accountPassword, 10);
                if (!account) {
                    await tx.user.create({
                        data: {
                            email: dto.accountEmail.trim(),
                            name: dto.accountName?.trim() || updated.contactName || updated.name,
                            passwordHash,
                            role: client_1.RoleType.HOTEL,
                            hotelId: updated.id,
                            isActive: updated.isActive,
                        },
                    });
                }
                else {
                    await tx.user.update({
                        where: { id: account.id },
                        data: {
                            email: dto.accountEmail.trim(),
                            passwordHash,
                            name: dto.accountName?.trim() || undefined,
                        },
                    });
                }
            }
            else if (account) {
                const userData = {};
                if (dto.accountEmail)
                    userData.email = dto.accountEmail.trim();
                if (dto.accountName !== undefined) {
                    userData.name = dto.accountName.trim() || null;
                }
                if (dto.isActive !== undefined)
                    userData.isActive = dto.isActive;
                if (Object.keys(userData).length > 0) {
                    await tx.user.update({ where: { id: account.id }, data: userData });
                }
            }
            return updated;
        });
        await this.audit.log({
            entityType: 'Hotel',
            entityId: id,
            action: 'UPDATE_HOTEL',
            beforeData: { ...before, users: undefined },
            afterData: { ...hotel, accountEmail: dto.accountEmail ?? account?.email },
            changedBy: actor.id,
        });
        return this.findOne(id);
    }
    async remove(id, actor) {
        const hotel = await this.prisma.hotel.findUnique({
            where: { id },
            include: { _count: { select: { bookings: true } } },
        });
        if (!hotel)
            throw new common_1.NotFoundException('Hotel not found');
        if (hotel._count.bookings > 0) {
            const updated = await this.prisma.hotel.update({
                where: { id },
                data: { isActive: false },
            });
            await this.prisma.user.updateMany({
                where: { hotelId: id },
                data: { isActive: false },
            });
            await this.audit.log({
                entityType: 'Hotel',
                entityId: id,
                action: 'DEACTIVATE_HOTEL',
                beforeData: hotel,
                afterData: updated,
                changedBy: actor.id,
            });
            return { deactivated: true };
        }
        await this.prisma.$transaction([
            this.prisma.user.deleteMany({ where: { hotelId: id } }),
            this.prisma.hotel.delete({ where: { id } }),
        ]);
        await this.audit.log({
            entityType: 'Hotel',
            entityId: id,
            action: 'DELETE_HOTEL',
            beforeData: hotel,
            changedBy: actor.id,
        });
        return { deleted: true };
    }
    async dashboard(actor, requestedHotelId) {
        const hotel = await this.resolveHotel(actor, requestedHotelId);
        const bookings = await this.loadBookings(hotel.id);
        return this.summarize(hotel, bookings);
    }
    async bookings(actor, query, requestedHotelId) {
        const hotel = await this.resolveHotel(actor, requestedHotelId);
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const where = { hotelId: hotel.id };
        if (query.payment) {
            where.payment = query.payment;
        }
        const from = query.fromDate
            ? new Date(`${query.fromDate}T00:00:00.000+07:00`)
            : null;
        const to = query.toDate
            ? new Date(`${query.toDate}T23:59:59.999+07:00`)
            : null;
        if (from || to) {
            where.startingDate = {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
            };
        }
        const search = query.search?.trim();
        if (search) {
            where.OR = [
                { bookingRef: { contains: search, mode: 'insensitive' } },
                { customerName: { contains: search, mode: 'insensitive' } },
                { hotelName: { contains: search, mode: 'insensitive' } },
                { tour: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const all = await this.prisma.booking.findMany({
            where,
            orderBy: [{ startingDate: 'desc' }, { createdAt: 'desc' }],
            take: 5000,
            select: this.bookingSelect(),
        });
        const rows = all.map((row) => this.mapBooking(row, hotel));
        const active = rows.filter((row) => row.status !== client_1.BookingStatus.CANCELED);
        const summary = this.sumRows(active);
        return {
            items: rows.slice((page - 1) * pageSize, page * pageSize),
            total: rows.length,
            page,
            pageSize,
            summary,
        };
    }
    async findOne(id) {
        const hotel = await this.prisma.hotel.findUnique({
            where: { id },
            include: {
                users: {
                    select: { id: true, email: true, name: true, isActive: true },
                },
                _count: { select: { bookings: true } },
            },
        });
        if (!hotel)
            throw new common_1.NotFoundException('Hotel not found');
        return {
            ...hotel,
            commissionPercent: Number(hotel.commissionPercent),
            bookingsCount: hotel._count.bookings,
        };
    }
    async resolveHotel(actor, requestedHotelId) {
        const user = await this.prisma.user.findUnique({
            where: { id: actor.id },
            select: { hotelId: true, role: true },
        });
        const hotelId = requestedHotelId && user?.role === client_1.RoleType.ADMIN
            ? requestedHotelId
            : user?.hotelId;
        if (!hotelId) {
            throw new common_1.BadRequestException('This account is not linked to a hotel');
        }
        const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId } });
        if (!hotel)
            throw new common_1.NotFoundException('Hotel not found');
        return hotel;
    }
    bookingSelect() {
        return {
            id: true,
            bookingRef: true,
            customerName: true,
            hotelName: true,
            startingDate: true,
            totalPax: true,
            totalAmount: true,
            currency: true,
            payment: true,
            status: true,
            tourId: true,
            hotelCommissionPercent: true,
            tour: { select: { id: true, name: true } },
            assignment: { select: { status: true } },
        };
    }
    async loadBookings(hotelId) {
        return this.prisma.booking.findMany({
            where: { hotelId },
            orderBy: [{ startingDate: 'desc' }, { createdAt: 'desc' }],
            take: 5000,
            select: this.bookingSelect(),
        });
    }
    mapBooking(row, hotel) {
        const rate = Number(row.hotelCommissionPercent ?? hotel.commissionPercent ?? 0);
        const amount = Number(row.totalAmount ?? 0);
        const commission = Math.round((amount * rate) / 100);
        const earned = row.status !== client_1.BookingStatus.CANCELED &&
            row.payment === client_1.PaymentStatus.PAID &&
            row.assignment?.status === client_1.AssignmentStatus.COMPLETED;
        return {
            id: row.id,
            bookingRef: row.bookingRef,
            customerName: row.customerName,
            hotelName: row.hotelName,
            startingDate: row.startingDate,
            totalPax: row.totalPax,
            totalAmount: amount,
            currency: row.currency,
            payment: row.payment,
            status: row.status,
            assignmentStatus: row.assignment?.status ?? null,
            tourId: row.tourId,
            tourName: row.tour?.name ?? null,
            commissionPercent: rate,
            commissionAmount: commission,
            commissionEarned: earned,
        };
    }
    sumRows(rows) {
        return rows.reduce((acc, row) => {
            acc.bookings += 1;
            acc.pax += Number(row.totalPax ?? 0);
            acc.revenue += Number(row.totalAmount ?? 0);
            if (row.commissionEarned)
                acc.earned += row.commissionAmount;
            else
                acc.pending += row.commissionAmount;
            return acc;
        }, { bookings: 0, pax: 0, revenue: 0, earned: 0, pending: 0 });
    }
    summarize(hotel, raw) {
        const rows = raw.map((row) => this.mapBooking(row, hotel));
        const active = rows.filter((row) => row.status !== client_1.BookingStatus.CANCELED);
        const totals = this.sumRows(active);
        const tourMap = new Map();
        for (const row of active) {
            const key = row.tourId ?? `name:${row.tourName ?? 'unknown'}`;
            const entry = tourMap.get(key) ??
                {
                    tourId: row.tourId,
                    tourName: row.tourName ?? 'Unknown tour',
                    bookings: 0,
                    pax: 0,
                    revenue: 0,
                    earned: 0,
                    pending: 0,
                };
            entry.bookings += 1;
            entry.pax += row.totalPax ?? 0;
            entry.revenue += row.totalAmount;
            if (row.commissionEarned)
                entry.earned += row.commissionAmount;
            else
                entry.pending += row.commissionAmount;
            tourMap.set(key, entry);
        }
        const byTour = [...tourMap.values()].sort((a, b) => b.revenue - a.revenue);
        return {
            hotel: {
                id: hotel.id,
                name: hotel.name,
                commissionPercent: Number(hotel.commissionPercent ?? 0),
            },
            totals: {
                ...totals,
                tours: byTour.length,
            },
            byTour,
            recentBookings: rows.slice(0, 8),
        };
    }
};
exports.HotelsService = HotelsService;
exports.HotelsService = HotelsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], HotelsService);
//# sourceMappingURL=hotels.service.js.map