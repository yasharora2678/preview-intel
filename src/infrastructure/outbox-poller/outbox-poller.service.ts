import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { OutboxMessageRepository } from '../repositories/outbox-message.repository';
import { ConfigService } from '@nestjs/config';
import { OutboxMessage } from 'webhook-reciever/src/domain/outbox-message/outbox-message.entity';
import * as crypto from 'crypto';
import { JobPriority } from 'webhook-reciever/src/shared/pre-review-job-data';
import { OutBoxStatus } from 'webhook-reciever/src/domain/outbox-message/enums/outbox-message.enum';
import { LessThanOrEqual } from 'typeorm';

@Injectable()
export class OutboxPollerService implements OnModuleDestroy {
  private readonly logger = new Logger(OutboxPollerService.name);
  private isPolling = false;

  constructor(
    @InjectQueue('pr-review')
    private readonly queue: Queue,
    @InjectRepository(OutboxMessageRepository)
    private readonly repository: OutboxMessageRepository,
    private readonly configService: ConfigService,
  ) {}

  @Cron('*/60 * * * * *')
  async pollOutbox() {
    if (this.isPolling) return; // prevent overlapping polls
    this.isPolling = true;

    try {
      const limit = this.configService.get<number>('MESSAGE_LIMIT');
      const outboxMessages: OutboxMessage[] =
        await this.repository.getUnsentMessages(limit);

      for (const message of outboxMessages) {
        await this.publishEvent(message);
      }
    } catch (error) {
      this.logger.error({ error }, 'Outbox poller error');
    } finally {
      this.isPolling = false;
    }
  }

  async publishEvent(outboxMessage: OutboxMessage) {
    try {
      const { payload } = outboxMessage;

      // Deduplication key: same PR + same commit = same job
      const jobId = crypto
        .createHash('md5')
        .update(
          `${payload.githubRepoId}:${payload.prNumber}:${payload.headCommitSha}`,
        )
        .digest('hex');

      const priority =
        payload.action === 'synchronize' ? JobPriority.LOW : JobPriority.NORMAL;

      // If synchronize: remove old job for this PR first
      if (payload.action === 'synchronize') {
        const oldJobId = crypto
          .createHash('md5')
          .update(`${payload.githubRepoId}:${payload.prNumber}:old`)
          .digest('hex');
        // BullMQ jobId-based dedup handles this automatically
      }

      await this.queue.add(
        'review-pr',
        { ...payload, outboxEventId: outboxMessage.id },
        {
          jobId,
          priority,
        },
      );

      outboxMessage.markAsSent();

      this.logger.log(
        { jobId, prNumber: payload.prNumber, repo: payload.repoFullName },
        'Published to queue',
      );

      await this.repository.save(outboxMessage);
    } catch (error) {
      this.logger.error(
        { error, eventId: outboxMessage.id },
        'Failed to publish outbox event',
      );

      const outbox = await this.repository.findOneBy({
        id: outboxMessage.id,
      });

      outbox.markAttempt();

      await this.repository.save(outbox);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldEvents(): Promise<void> {
    const outBoxMessage = await this.repository.delete({
      status: OutBoxStatus.PUBLISHED,
      published_at: LessThanOrEqual(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    });

    this.logger.log(
      { deleted: outBoxMessage.affected },
      'Cleaned up old outbox events',
    );
  }

  onModuleDestroy() {
    this.isPolling = false;
  }
}
