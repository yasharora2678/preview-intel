import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OutboxMessageRepository } from '../repositories/outbox-message.repository';
import { ConfigService } from '@nestjs/config';
import { OutboxMessage } from 'src/domain/outbox-message/outbox-message.entity';
import * as crypto from 'crypto';
import { JobPriority } from 'src/shared/pr-review-job-data';
import { OutBoxStatus } from 'src/domain/outbox-message/enums/outbox-message.enum';
import { LessThanOrEqual } from 'typeorm';
import { CacheService } from 'src/infrastructure/cache/cache.service';

const priorityMap: Record<string, number> = {
  review_requested: JobPriority.HIGH,
  opened: JobPriority.NORMAL,
  reopened: JobPriority.NORMAL,
  synchronize: JobPriority.LOW,
};

@Injectable()
export class OutboxPollerService implements OnModuleDestroy {
  private readonly logger = new Logger(OutboxPollerService.name);
  private isPolling = false;

  constructor(
    @InjectQueue('pr-review')
    private readonly queue: Queue,
    private readonly repository: OutboxMessageRepository,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  @Cron('*/60 * * * * *')
  async pollOutbox() {
    if (this.isPolling) return;
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

      const jobId = crypto
        .createHash('md5')
        .update(
          `${payload.githubRepoId}:${payload.prNumber}:${payload.headCommitSha}`,
        )
        .digest('hex');

      const priority = priorityMap[payload.action] ?? JobPriority.NORMAL;

      if (payload.action === 'synchronize') {
        const prJobKey = `pr-dedup:${payload.githubRepoId}:${payload.prNumber}`;
        const previousJobId = await this.cacheService.get<string>(prJobKey);

        if (previousJobId !== jobId) {
          const previousJob = await this.queue.getJob(previousJobId);
          if (previousJob) {
            const state = await previousJob.getState();
            if (state === 'waiting' || state === 'delayed') {
              await previousJob.remove();
              this.logger.log(
                { previousJobId, prNumber: payload.prNumber },
                'Removed stale waiting job for re-pushed PR',
              );
            }
          }
        }
      }

      await this.queue.add(
        'review-pr',
        { ...payload, outboxEventId: outboxMessage.id },
        {
          jobId,
          priority,
        },
      );

      const prJobKey = `pr-dedup:${payload.githubRepoId}:${payload.prNumber}`;
      await this.cacheService.set(prJobKey, jobId, 60 * 60 * 24);

      outboxMessage.markAsSent();

      this.logger.log(
        {
          jobId,
          prNumber: payload.prNumber,
          repo: payload.repoFullName,
          traceId: payload.traceId,
        },
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
      published_at: LessThanOrEqual(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      ),
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
