import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebHooksHandler } from './webhooks.service';
import { OutboxMessageRepository } from 'src/infrastructure/repositories/outbox-message.repository';
import { GithubWebhookGuard } from './guards/github-webhook.guard';
import { CreateInstallationModule } from '../installations/create-installation/create-installation.module';
import { CreateRepositoryModule } from '../repositories/create-repository/create-repository.module';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';
import { UserRepository } from 'src/infrastructure/repositories/user-repository';

@Module({
  imports: [CreateInstallationModule, CreateRepositoryModule],
  controllers: [WebhooksController],
  providers: [
    WebHooksHandler,
    OutboxMessageRepository,
    GithubWebhookGuard,
    InstallationRepository,
    UserRepository,
  ],
})
export class WebhooksModule {}
