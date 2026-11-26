import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto';
export declare class PartnersService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    list(search?: string, includeInactive?: boolean): import("@prisma/client").Prisma.PrismaPromise<({
        _count: {
            assignments: number;
            partnerPayments: number;
        };
    } & {
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        email: string | null;
        isActive: boolean;
        contactName: string | null;
        phone: string | null;
        address: string | null;
        note: string | null;
    })[]>;
    findOne(id: string): Promise<{
        _count: {
            assignments: number;
            partnerPayments: number;
        };
    } & {
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        email: string | null;
        isActive: boolean;
        contactName: string | null;
        phone: string | null;
        address: string | null;
        note: string | null;
    }>;
    findActive(id: string): Promise<{
        _count: {
            assignments: number;
            partnerPayments: number;
        };
    } & {
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        email: string | null;
        isActive: boolean;
        contactName: string | null;
        phone: string | null;
        address: string | null;
        note: string | null;
    }>;
    create(dto: CreatePartnerDto): Promise<{
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        email: string | null;
        isActive: boolean;
        contactName: string | null;
        phone: string | null;
        address: string | null;
        note: string | null;
    }>;
    update(id: string, dto: UpdatePartnerDto): Promise<{
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        email: string | null;
        isActive: boolean;
        contactName: string | null;
        phone: string | null;
        address: string | null;
        note: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
