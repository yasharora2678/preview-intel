import { OutboxMessageRepository } from './../../infrastructure/repositories/outbox-message.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class WebHooksHandler {
  constructor(
    @InjectRepository(OutboxMessageRepository)
    private readonly outboxMessageRepository : OutboxMessageRepository
  ) {}

  public async handle(event: String, payload: any) {
    const action = payload.action;

    if (event === 'pull_request') {
      if (
        action === 'opened' ||
        action === 'synchronize' ||
        action === 'reopened'
      ) {
        await this.outboxMessageRepository.storeOutboxMessage({event_type: `${event}.${action}`, payload});
      }
    }

    if (event === 'installation') {
      if (action === 'created' || action === 'deleted') {
        await this.outboxMessageRepository.storeOutboxMessage({event_type: `${event}.${action}`, payload});
      }
    }
  }
}
