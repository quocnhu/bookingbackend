import { CompanyProfileService } from './company-profile.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
export declare class CompanyProfileController {
    private readonly companyProfileService;
    constructor(companyProfileService: CompanyProfileService);
    get(): Promise<{
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
    update(dto: UpdateCompanyProfileDto, actor: AuthenticatedUser): Promise<{
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
