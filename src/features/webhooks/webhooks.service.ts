import { UserRepository } from './../../infrastructure/repositories/user-repository';
import { OutboxMessageRepository } from '../../infrastructure/repositories/outbox-message.repository';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { CreateInstallationHandler } from '../installations/create-installation/create-installation.service';
import { CreateRepositoryHandler } from '../repositories/create-repository/create-repository.service';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';
import { randomUUID } from 'crypto';

const PROCESSABLE_ACTIONS = new Set([
  'opened',
  'synchronize',
  'reopened',
  'review_requested',
]);

@Injectable()
export class WebHooksHandler {
  private readonly logger = new Logger(WebHooksHandler.name);

  constructor(
    private readonly outboxMessageRepository: OutboxMessageRepository,
    private readonly createInstallationHandler: CreateInstallationHandler,
    private readonly createRepositoryHandler: CreateRepositoryHandler,
    private readonly installationRepository: InstallationRepository,
    private readonly userRepository: UserRepository,
  ) {}

  @Transactional()
  public async handle(eventType: string, deliveryId: string, payload: any) {
    // ── Installation lifecycle events ───────────────────────────────────────
    if (eventType === 'installation') {
      return this.handleInstallationEvent(payload);
    }

    if (eventType === 'installation_repositories') {
      return this.handleInstallationRepositoriesEvent(payload);
    }

    if (eventType !== 'pull_request') return;

    if (!PROCESSABLE_ACTIONS.has(payload.action)) {
      this.logger.debug({ action: payload.action }, 'Ignoring PR action');
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

    if (repository.skip_bots && payload.sender?.type === 'Bot') {
      this.logger.debug(
        { repoId: repository.id },
        'Skipping bot PR (skip_bots=true)',
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
      traceId: randomUUID(),
    };

    await this.outboxMessageRepository.storeOutboxMessage({
      event_type: `${eventType}.${payload.action}`,
      payload: messagePayload,
      delivery_id: deliveryId,
    });

    this.logger.log(
      { deliveryId, prNumber: pr?.number, traceId: messagePayload.traceId },
      'Written to outbox',
    );
  }

  // When someone installs the GitHub App on their account/org
  private async handleInstallationEvent(payload: any) {
    const action = payload.action;
    const githubInstallationId = payload.installation?.id;

    if (!githubInstallationId) return;

    if (action === 'created') {
      // Try to link to an existing user (if they've already logged in via OAuth)
      const senderGithubId = payload.sender?.id;
      const user = senderGithubId
        ? await this.userRepository.findOne({
            where: { github_id: senderGithubId },
          })
        : null;

      const existing = await this.installationRepository.findOne({
        where: { github_installation_id: githubInstallationId },
      });

      if (!existing) {
        await this.installationRepository.save({
          github_installation_id: githubInstallationId,
          github_account_login: payload.installation.account.login,
          github_account_type: payload.installation.account.type,
          llm_provider: 'groq',
          is_active: true,
          user_id: user?.id ?? null, // linked if user exists, null otherwise
          sender_github_id: senderGithubId ?? null,
        });
        this.logger.log(
          { githubInstallationId, linkedUserId: user?.id },
          'Created installation from installation event',
        );
      }
    }

    if (action === 'deleted' || action === 'suspend') {
      await this.installationRepository.update(
        { github_installation_id: githubInstallationId },
        { is_active: false },
      );
      this.logger.log(
        { githubInstallationId, action },
        'Installation deactivated',
      );
    }

    if (action === 'unsuspend') {
      await this.installationRepository.update(
        { github_installation_id: githubInstallationId },
        { is_active: true },
      );
    }
  }

  // When repos are added/removed from an existing installation
  private async handleInstallationRepositoriesEvent(payload: any) {
    const action = payload.action; // 'added' or 'removed'
    const installation = await this.installationRepository.findOne({
      where: { github_installation_id: payload.installation?.id },
    });
    if (!installation) return;

    // Repositories removed from the installation should be disabled
    if (action === 'removed') {
      const removedIds: number[] = (payload.repositories_removed ?? []).map(
        (r: any) => r.id,
      );
      this.logger.log({ removedIds }, 'Repositories removed from installation');
      // The actual disable will happen via the existing webhook flow or can be explicit here
    }

    this.logger.log(
      { action, added: payload.repositories_added?.length ?? 0 },
      'Installation repositories event processed',
    );
  }
}
