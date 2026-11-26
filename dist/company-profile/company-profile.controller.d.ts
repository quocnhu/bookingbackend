import { CompanyProfileService } from './company-profile.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class CompanyProfileController {
    private readonly companyProfileService;
    constructor(companyProfileService: CompanyProfileService);
    publicProfile(): Promise<{
        name: string;
        shortName: string | null;
        logoUrl: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        website: string | null;
        latitude: number | null;
        longitude: number | null;
    } | null>;
    get(): Promise<{
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
    update(dto: UpdateCompanyProfileDto, actor: AuthenticatedUser): Promise<{
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
    uploadLogo(file: Express.Multer.File | undefined, actor: AuthenticatedUser): Promise<{
        logoUrl: string | null;
    }>;
}
