import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DlqAlertService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DlqAlertService.name);
  private queueEvents: QueueEvents;

  constructor(
    @InjectQueue('pr-review') private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    this.queueEvents = new QueueEvents('pr-review', {
      connection: { url: this.config.get('REDIS_URL') },
    });

    this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
      const job = await this.queue.getJob(jobId);
      if (!job) return;

      const maxAttempts = job.opts?.attempts ?? 4;

      if (job.attemptsMade >= maxAttempts) {
        this.logger.error(
          {
            alert: 'DLQ_JOB_FAILED',
            jobId,
            prNumber: job.data?.prNumber,
            repo: job.data?.repoFullName,
            attempts: job.attemptsMade,
            reason: failedReason,
          },
          '🚨 Job moved to DLQ after exhausting all retries — manual intervention required',
        );

        const alertUrl = this.config.get<string>('DLQ_ALERT_WEBHOOK_URL');
        if (alertUrl) {
          await this.sendWebhookAlert(alertUrl, jobId, job.data, failedReason);
        }
      }
    });
  }

  private async sendWebhookAlert(
    url: string,
    jobId: string,
    data: any,
    reason: string,
  ): Promise<void> {
    try {
      const { default: axios } = await import('axios');
      await axios.post(url, {
        event: 'dlq.job_failed',
        jobId,
        prNumber: data?.prNumber,
        repo: data?.repoFullName,
        reason,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.warn({ err }, 'Failed to send DLQ alert webhook');
    }
  }
}
