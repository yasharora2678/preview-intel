import { OutboxMessageRepository } from './../../infrastructure/repositories/outbox-message.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class WebHooksHandler {
  constructor(
    @InjectRepository(OutboxMessageRepository)
    private readonly outboxMessageRepository: OutboxMessageRepository,
  ) {}

  public async handle(event: string, payload: any) {
    const action = payload.action;

    if (event === 'pull_request') {
      if (
        action === 'opened' ||
        action === 'synchronize' ||
        action === 'reopened'
      ) {
        const messagePayload = {
          installationId: payload.installation?.id,
          owner: payload.repository?.owner?.login,
          repo: payload.repository?.name,
          prNumber: payload.pull_request?.number,
          sha: payload.pull_request?.head?.sha,
          prTitle: payload.pull_request?.title,
          action,
        };

        await this.outboxMessageRepository.storeOutboxMessage({
          event_type: `${event}.${action}`,
          payload: messagePayload,
        });
      }
    }

    if (event === 'installation') {
      if (action === 'created' || action === 'deleted') {
        const messagePayload = {
          installationId: payload.installation?.id,
          accountLogin: payload.installation?.account?.login,
          accountType: payload.installation?.account?.type,
          action,
        };

        await this.outboxMessageRepository.storeOutboxMessage({
          event_type: `${event}.${action}`,
          payload: messagePayload,
        });
      }
    }
  }
}
