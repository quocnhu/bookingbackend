import { PartnersService } from './partners.service';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto';
export declare class PartnersController {
    private readonly partnersService;
    constructor(partnersService: PartnersService);
    list(search?: string, includeInactive?: string): import("@prisma/client").Prisma.PrismaPromise<({
        _count: {
            assignments: number;
            partnerPayments: number;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        email: string | null;
        isActive: boolean;
        updatedAt: Date;
        address: string | null;
        phone: string | null;
        note: string | null;
        contactName: string | null;
    })[]>;
    findOne(id: string): Promise<{
        _count: {
            assignments: number;
            partnerPayments: number;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        email: string | null;
        isActive: boolean;
        updatedAt: Date;
        address: string | null;
        phone: string | null;
        note: string | null;
        contactName: string | null;
    }>;
    create(dto: CreatePartnerDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        email: string | null;
        isActive: boolean;
        updatedAt: Date;
        address: string | null;
        phone: string | null;
        note: string | null;
        contactName: string | null;
    }>;
    update(id: string, dto: UpdatePartnerDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        email: string | null;
        isActive: boolean;
        updatedAt: Date;
        address: string | null;
        phone: string | null;
        note: string | null;
        contactName: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
