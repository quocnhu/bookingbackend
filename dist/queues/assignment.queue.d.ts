import { Queue } from 'bullmq';
export interface AssignJobData {
    bookingId: string;
}
export declare class AssignmentQueue {
    private readonly queue;
    private readonly logger;
    constructor(queue: Queue<AssignJobData>);
    enqueue(bookingId: string): Promise<{
        enqueued: boolean;
        bookingId: string;
        reason?: undefined;
    } | {
        enqueued: boolean;
        bookingId: string;
        reason: string | undefined;
    }>;
}
