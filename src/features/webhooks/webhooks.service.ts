import { OutboxMessageRepository } from '../../infrastructure/repositories/outbox-message.repository';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { CreateInstallationHandler } from '../installations/create-installation.service';
import { CreateRepositoryHandler } from '../repositories/create-repository/create-repository.service';

const PROCESSABLE_ACTIONS = new Set(['opened', 'synchronize', 'reopened']);

@Injectable()
export class WebHooksHandler {
  private readonly logger = new Logger(WebHooksHandler.name);

  constructor(
    private readonly outboxMessageRepository: OutboxMessageRepository,
    private readonly createInstallationHandler: CreateInstallationHandler,
    private readonly createRepositoryHandler: CreateRepositoryHandler,
  ) {}

  @Transactional()
  public async handle(eventType: string, deliveryId: string, payload: any) {
    if (eventType !== 'pull_request') return;

    if (!PROCESSABLE_ACTIONS.has(payload.action)) {
      this.logger.debug({ action: payload.action }, 'Ignoring PR action');
      return;
    }

    // Skip draft PRs (configurable later)
    if (payload.pull_request?.draft === true) {
      this.logger.debug('Skipping draft PR');
      return;
    }

    // Skip bot accounts
    const senderType = payload.sender?.type;
    if (senderType === 'Bot') {
      this.logger.debug('Skipping bot PR');
      return;
    }

    const eventExists =
      await this.outboxMessageRepository.findByDeliveryId(deliveryId);
    if (eventExists) {
      this.logger.warn({ deliveryId }, 'Duplicate delivery ID — skipping');
      return;
    }

    await this.createInstallationHandler.handle(payload);

    const repository = await this.createRepositoryHandler.handle(payload);

    if (!repository) {
      this.logger.warn(
        { repoId: payload.repository?.id },
        'Repository could not be created — installation not found, skipping',
      );
      return;
    }

    if (!repository.is_enabled) {
      this.logger.debug(
        { repoId: repository.id, fullName: repository.full_name },
        'Repository has reviews disabled — skipping',
      );
      return;
    }

    const pr = payload.pull_request;

    const messagePayload = {
      installationId: payload.installation?.id,
      repositoryId: repository.id,
      githubRepoId: payload.repository?.id,
      repoFullName: payload.repository?.full_name,
      prNumber: pr?.number,
      prTitle: pr?.title,
      headCommitSha: pr?.head?.sha,
      baseBranch: pr?.base?.ref,
      headBranch: pr?.head?.ref,
      authorLogin: pr?.user?.login,
      action: payload.action,
      githubPrUrl: pr?.html_url,
    };

    await this.outboxMessageRepository.storeOutboxMessage({
      event_type: `${eventType}.${payload.action}`,
      payload: messagePayload,
      delivery_id: deliveryId,
    });

    this.logger.log(
      { deliveryId, prNumber: payload.pull_request?.number },
      'Written to outbox',
    );
  }
}
