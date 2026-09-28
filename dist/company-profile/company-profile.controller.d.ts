import { CompanyProfileService } from './company-profile.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class CompanyProfileController {
    private readonly companyProfileService;
    constructor(companyProfileService: CompanyProfileService);
    get(): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        email: string | null;
        updatedAt: Date;
        website: string | null;
        phone: string | null;
        address: string | null;
        rootLatitude: number | null;
        rootLongitude: number | null;
        taxId: string | null;
    } | null>;
    update(dto: UpdateCompanyProfileDto, actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        email: string | null;
        updatedAt: Date;
        website: string | null;
        phone: string | null;
        address: string | null;
        rootLatitude: number | null;
        rootLongitude: number | null;
        taxId: string | null;
    }>;
}
