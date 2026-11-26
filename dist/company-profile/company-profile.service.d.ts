import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import type { FileStorage } from "../storage";
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class CompanyProfileService {
    private readonly prisma;
    private readonly auditService;
    private readonly storage;
    constructor(prisma: PrismaService, auditService: AuditService, storage: FileStorage);
    getProfile(): Promise<{
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        email: string | null;
        phone: string | null;
        address: string | null;
        website: string | null;
        rootLatitude: number | null;
        rootLongitude: number | null;
        shortName: string | null;
        logoUrl: string | null;
        taxId: string | null;
    } | null>;
    updateProfile(dto: UpdateCompanyProfileDto, actor: AuthenticatedUser): Promise<{
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        email: string | null;
        phone: string | null;
        address: string | null;
        website: string | null;
        rootLatitude: number | null;
        rootLongitude: number | null;
        shortName: string | null;
        logoUrl: string | null;
        taxId: string | null;
    }>;
    updateLogo(file: Express.Multer.File | undefined, actor: AuthenticatedUser): Promise<{
        logoUrl: string | null;
    }>;
}
