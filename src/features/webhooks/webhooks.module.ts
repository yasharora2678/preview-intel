import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebHooksHandler } from './webhooks.service';
import { OutboxMessageRepository } from 'src/infrastructure/repositories/outbox-message.repository';
import { GithubWebhookGuard } from './guards/github-webhook.guard';
import { CreateInstallationModule } from '../installations/create-installation.module';
import { CreateRepositoryModule } from '../repositories/create-repository.module';

@Module({
  imports: [CreateInstallationModule, CreateRepositoryModule],
  controllers: [WebhooksController],
  providers: [WebHooksHandler, OutboxMessageRepository, GithubWebhookGuard],
})
export class WebhooksModule {}
