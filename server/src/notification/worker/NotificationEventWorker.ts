import { NotificationEventSource } from './NotificationEventSource';
import { NotificationEventDispatcher } from './NotificationEventDispatcher';
import { DomainEvent } from '../../tracking/domain/events/DomainEvent';
import db from '../../config/database';

/**
 * NotificationEventWorker — coordinates background outbox polling, transactional delivery commits, and retries.
 *
 * RFC-009 Specification
 */
export class NotificationEventWorker {
  private isRunning = false;
  private isProcessing = false;
  public processedEventCount = 0;
  private readonly retryLimits = new Map<string, number>();

  constructor(
    private readonly source: NotificationEventSource,
    private readonly dispatcher: NotificationEventDispatcher,
    private readonly pollIntervalMs: number = 200,
    private readonly batchSize: number = 10
  ) {}

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🚀 [NotificationEventWorker] Background polling worker started');
    this.pollLoop();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    while (this.isProcessing) {
      await new Promise(r => setTimeout(r, 50));
    }
    console.log('🛑 [NotificationEventWorker] Background polling worker stopped');
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
        console.error('🚨 [NotificationEventWorker] Tick processing error:', err.message);
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
    const events = await this.source.poll(this.batchSize);
    if (events.length === 0) return 0;

    let successCount = 0;
    for (const event of events) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        // Dispatch handler
        await this.dispatcher.dispatch(event, conn);

        // Acknowledge processed marker
        await this.source.acknowledge(event, conn);

        await conn.commit();
        this.processedEventCount++;
        successCount++;
      } catch (err: any) {
        await conn.rollback();
        console.warn(`⚠️ [NotificationEventWorker] Failed to process event ${event.eventId}: ${err.message}`);
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
      // 3 strikes: move to DLQ dead letter box
      console.error(`🚨 [NotificationEventWorker] Event ${event.eventId} exceeded retries. Moving to Dead Letter Queue (DLQ).`);
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        
        // Write to DLQ table
        const query = `
          INSERT INTO dead_letter_events (
            event_id, aggregate_id, aggregate_type, event_type, payload, error_message, retry_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await conn.execute(query, [
          event.eventId,
          event.payload.orderId || event.payload.shopId || 'unknown',
          'NotificationEvent',
          event.eventType,
          JSON.stringify(event.payload),
          error.message,
          5
        ]);

        // Acknowledge in inbox processed markers to remove from pending stream
        await this.source.acknowledge(event, conn);

        await conn.commit();
      } catch (dlqErr: any) {
        await conn.rollback();
        console.error('🚨 [NotificationEventWorker] Failed to write event to DLQ:', dlqErr.message);
      } finally {
        conn.release();
      }
    } else {
      this.retryLimits.set(event.eventId, retries + 1);
      // Wait a moment before allowing the event to poll again
      console.log(`🔄 [NotificationEventWorker] Event ${event.eventId} marked for retry (${retries + 1}/3)`);
    }
  }
}
