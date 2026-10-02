declare const PAYABLE_ROLES: readonly ["TOUR_GUIDE", "DRIVER"];
declare const PAYEE_TYPES: readonly ["TRANSPORT_PROVIDER", "COMPANY_GUIDE", "COMPANY_DRIVER", "FREELANCE"];
export declare class PayeeTypeDto {
    payeeType?: (typeof PAYEE_TYPES)[number];
}
export declare class PeriodQueryDto {
    fromDate: string;
    toDate: string;
    payeeType?: (typeof PAYEE_TYPES)[number];
    payeeId?: string;
    personId?: string;
    unpaidOnly?: boolean;
}
export declare class ExportPeriodDto {
    fromDate: string;
    toDate: string;
    payeeType?: (typeof PAYEE_TYPES)[number];
    payeeId: string;
    note?: string;
}
export declare class VerifyTourMoneyDto {
    note?: string;
    payableToId?: string;
}
export declare class RejectMoneyDto {
    reason: string;
}
export declare class ReverseSettlementDto {
    note: string;
}
export declare class ReverseTourMoneyDto {
    note?: string;
}
export declare class CreateSettlementDto {
    amount: number;
    note?: string;
    categoryId?: string;
    bookingId?: string;
}
export declare class UpdateSettlementDto {
    amount?: number;
    note?: string;
    categoryId?: string;
}
export declare class CreateSettlementCategoryDto {
    code: string;
    name: string;
    flowType: 'COLLECT_MONEY' | 'PAY_MONEY';
}
export declare class ListPeopleQueryDto {
    role?: (typeof PAYABLE_ROLES)[number];
}
export declare class PeriodIdParamDto {
    id: string;
}
export declare class LimitQueryDto {
    limit?: number;
}
export declare class VoidPeriodDto {
    reason: string;
}
export {};
