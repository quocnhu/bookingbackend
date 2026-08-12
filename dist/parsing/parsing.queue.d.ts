import { Queue } from 'bullmq';
export declare const PARSE_QUEUE = "parse";
export declare const PARSE_JOB = "parse-raw-data";
export interface ParseJobData {
    rawDataId: string;
}
export declare class ParsingQueue {
    private readonly queue;
    constructor(queue: Queue<ParseJobData>);
    enqueue(rawDataId: string): Promise<{
        enqueued: boolean;
        rawDataId: string;
    }>;
}
