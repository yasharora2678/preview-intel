import { Processor, InjectQueue, OnWorkerEvent } from '@nestjs/bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';

@Processor('pr-review')
export class PrReviewProcessor extends WorkerHost {
  constructor(
    @InjectQueue('pr-review-dead')
    private readonly deadQueue: Queue,
  ) {
    super();
  }

  async process(job: Job) {
    console.log('Processing PR review job');

    console.log(job.data);

    return true;
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error) {
    console.error(
      `Job ${job.name} failed (attempt ${job.attemptsMade})`,
      error.message,
    );

    if (job.name !== 'review-pr') return;

    if (job.attemptsMade >= job.opts.attempts) {
      console.warn(`Moving job ${job.id} to dead letter queue`);

      await this.deadQueue.add('dead-pr-review', job.data);
    }
  }
}
