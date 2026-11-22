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
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        email: string | null;
        isActive: boolean;
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
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        email: string | null;
        isActive: boolean;
        address: string | null;
        phone: string | null;
        note: string | null;
        contactName: string | null;
    }>;
    create(dto: CreatePartnerDto): Promise<{
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        email: string | null;
        isActive: boolean;
        address: string | null;
        phone: string | null;
        note: string | null;
        contactName: string | null;
    }>;
    update(id: string, dto: UpdatePartnerDto): Promise<{
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        email: string | null;
        isActive: boolean;
        address: string | null;
        phone: string | null;
        note: string | null;
        contactName: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
