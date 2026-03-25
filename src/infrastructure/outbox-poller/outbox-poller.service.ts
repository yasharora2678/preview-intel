import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { OutboxMessageRepository } from '../repositories/outbox-message.repository';
import { ConfigService } from '@nestjs/config';
import { OutboxMessage } from 'src/domain/outbox-message/outbox-message.entity';

@Injectable()
export class OutboxPollerService {
  constructor(
    @InjectQueue('pr-review')
    private readonly prQueue: Queue,
    @InjectRepository(OutboxMessageRepository)
    private readonly repository: OutboxMessageRepository,
    private readonly configService: ConfigService,
  ) {}

  @Cron('*/60 * * * * *')
  async pollOutbox() {
    console.log('Polling outbox...');
    const limit = this.configService.get<number>('MESSAGE_LIMIT');
    const outboxMessages: OutboxMessage[] =
      await this.repository.getUnsentMessages(limit);

    for (const message of outboxMessages) {
      if (message.event_type === 'installation.created') {
        await this.handleInstallation(message.payload);
      } else {
        await this.publishEvent(message);
      }
    }
  }

  async publishEvent(outboxMessage: OutboxMessage) {
        const { payload } = outboxMessage;
        const jobId = `${payload.owner}-${payload.repo}-${payload.prNumber}`;

        await this.prQueue.add('review-pr', payload, {
          jobId,
        });
    
        outboxMessage.markAsSent();
    
        await this.repository.save(outboxMessage);
  }

  async handleInstallation(payload) {
    const installationId = payload.installation.id;
    const repos = payload.repositories;

    // save installation
    // save repos
  }
}
