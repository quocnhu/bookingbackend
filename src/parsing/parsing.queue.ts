import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const PARSE_QUEUE = 'parse';
export const PARSE_JOB = 'parse-raw-data';

export interface ParseJobData {
  rawDataId: string;
}

/**
 * Producer for the parse queue (Stage 2 — rawData → booking).
 * The {rawDataId} job is enqueued right after ingestion inserts rawData,
 * before acking Pub/Sub + advancing the historyId checkpoint.
 */
@Injectable()
export class ParsingQueue {
  constructor(
    @InjectQueue(PARSE_QUEUE) private readonly queue: Queue<ParseJobData>,
  ) {}

  async enqueue(rawDataId: string) {
    await this.queue.add(
      PARSE_JOB,
      { rawDataId },
      {
        jobId: `parse-${rawDataId}`,
        removeOnComplete: 1000,
        removeOnFail: 5000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
    return { enqueued: true, rawDataId };
  }
}
