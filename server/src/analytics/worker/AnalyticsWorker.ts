import { AnalyticsEventSource } from './AnalyticsEventSource';
import { AnalyticsEventDispatcher } from './AnalyticsEventDispatcher';
import { DomainEvent } from '../../tracking/domain/events/DomainEvent';
import { AnalyticsMetricsService } from '../application/metrics/AnalyticsMetricsService';
import db from '../../config/database';

/**
 * AnalyticsWorker — coordinates background outbox polling, transactional processing, and DLQ.
 * RFC-010 Specification
 */
export class AnalyticsWorker {
  private isRunning = false;
  private isProcessing = false;
  public processedEventCount = 0;
  private readonly retryLimits = new Map<string, number>();

  constructor(
    private readonly source: AnalyticsEventSource,
    private readonly dispatcher: AnalyticsEventDispatcher,
    private readonly pollIntervalMs: number = 200,
    private readonly batchSize: number = 10
  ) {}

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🚀 [AnalyticsWorker] Background worker started');
    this.pollLoop();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    while (this.isProcessing) {
      await new Promise(r => setTimeout(r, 50));
    }
    console.log('🛑 [AnalyticsWorker] Background worker stopped');
  }

  private async pollLoop(): Promise<void> {
    let emptyPolls = 0;
    let delay = this.pollIntervalMs;

    while (this.isRunning) {
      if (this.isProcessing) {
        break;
      }
      this.isProcessing = true;

      let workFound = false;
      try {
        const processedCount = await this.processBatch();
        if (processedCount > 0) {
          workFound = true;
        }
      } catch (err: any) {
        console.error('🚨 [AnalyticsWorker] Tick error:', err.message);
      } finally {
        this.isProcessing = false;
      }

      if (workFound) {
        emptyPolls = 0;
        delay = this.pollIntervalMs;
      } else {
        emptyPolls++;
        if (emptyPolls >= 15) {
          delay = 5000;
        } else if (emptyPolls >= 5) {
          delay = 3000;
        } else {
          delay = 1000;
        }
      }

      if (!this.isRunning) break;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private async processBatch(): Promise<number> {
    const start = Date.now();
    const events = await this.source.poll(this.batchSize);
    if (events.length === 0) return 0;

    let successCount = 0;
    for (const event of events) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        await this.dispatcher.dispatch(event, conn);
        await this.source.acknowledge(event, conn);
        await conn.commit();
        this.processedEventCount++;
        successCount++;
        AnalyticsMetricsService.lastProcessedEventId = event.eventId;
        AnalyticsMetricsService.processingDurationMs = Date.now() - start;
      } catch (err: any) {
        await conn.rollback();
        console.warn(`⚠️ [AnalyticsWorker] Failed to process ${event.eventId}: ${err.message}`);
        await this.handleFailure(event, err);
      } finally {
        conn.release();
      }
    }
    return successCount;
  }

  private async handleFailure(event: DomainEvent, error: any): Promise<void> {
    const retries = this.retryLimits.get(event.eventId) || 0;
    if (retries >= 2) {
      console.error(`🚨 [AnalyticsWorker] Event ${event.eventId} exceeded retries → DLQ`);
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute(
          `INSERT INTO dead_letter_events
             (event_id, aggregate_id, aggregate_type, event_type, payload, error_message, retry_count)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            event.eventId,
            event.payload.orderId || event.payload.shopId || 'unknown',
            'AnalyticsEvent',
            event.eventType,
            JSON.stringify(event.payload),
            error.message,
            5
          ]
        );
        await this.source.acknowledge(event, conn);
        await conn.commit();
      } catch (dlqErr: any) {
        await conn.rollback();
        console.error('🚨 [AnalyticsWorker] DLQ write failed:', dlqErr.message);
      } finally {
        conn.release();
      }
    } else {
      this.retryLimits.set(event.eventId, retries + 1);
    }
  }
}
