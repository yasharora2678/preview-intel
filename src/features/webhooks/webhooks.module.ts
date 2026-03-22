import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebHooksHandler } from './webhooks.service';
import { OutboxMessageRepository } from 'src/infrastructure/repositories/outbox-message.repository';

@Module({
  controllers: [WebhooksController],
  providers: [
    WebHooksHandler,
    OutboxMessageRepository,
  ],
})
export class WebhooksModule {}
