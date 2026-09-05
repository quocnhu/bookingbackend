import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class CompanyProfileService {
    private readonly prisma;
    private readonly auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    getProfile(): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        email: string | null;
        updatedAt: Date;
        website: string | null;
        phone: string | null;
        address: string | null;
        taxId: string | null;
    } | null>;
    updateProfile(dto: UpdateCompanyProfileDto, actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        email: string | null;
        updatedAt: Date;
        website: string | null;
        phone: string | null;
        address: string | null;
        taxId: string | null;
    }>;
}
