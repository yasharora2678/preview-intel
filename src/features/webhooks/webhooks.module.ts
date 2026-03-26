import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebHooksHandler } from './webhooks.service';
import { OutboxMessageRepository } from 'src/infrastructure/repositories/outbox-message.repository';
import { GithubWebhookGuard } from './guards/github-webhook.guard';

@Module({
  controllers: [WebhooksController],
  providers: [
    WebHooksHandler,
    OutboxMessageRepository,
    GithubWebhookGuard
  ],
})
export class WebhooksModule {}
