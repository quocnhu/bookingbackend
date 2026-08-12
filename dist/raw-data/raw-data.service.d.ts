import { RawDataRepository } from './raw-data.repository';
export declare class RawDataService {
    private readonly repository;
    private readonly logger;
    constructor(repository: RawDataRepository);
    createIngested(input: {
        sourceId: string;
        email: string;
        templateTag: string;
        payload: Record<string, unknown>;
    }): Promise<{
        id: string;
    }>;
    markUnparsed(id: string): Promise<void>;
    markParseFailed(id: string, reason: string): Promise<void>;
    markParsed(id: string, bookingId: string): Promise<void>;
    private appendReason;
    private hashPayload;
    summary(): Promise<Record<string, number>>;
}
