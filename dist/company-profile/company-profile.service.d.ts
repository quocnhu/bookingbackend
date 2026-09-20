import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
export declare class CompanyProfileService {
    private readonly prisma;
    private readonly auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    getProfile(): Promise<{
        rootLatitude: number | null;
        rootLongitude: number | null;
        id: string;
        address: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string | null;
        taxId: string | null;
        website: string | null;
    } | null>;
    updateProfile(dto: UpdateCompanyProfileDto, actor: AuthenticatedUser): Promise<{
        rootLatitude: number | null;
        rootLongitude: number | null;
        id: string;
        address: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string | null;
        taxId: string | null;
        website: string | null;
    }>;
}
