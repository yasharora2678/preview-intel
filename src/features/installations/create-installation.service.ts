import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';

@Injectable()
export class CreateInstallationHandler {
  private readonly logger = new Logger(CreateInstallationHandler.name);

  constructor(
    @InjectRepository(InstallationRepository)
    private readonly installationRepository: InstallationRepository,
  ) {}

  public async handle(payload: any) {
    const githubInstallationId = payload.installation?.id;
    if (!githubInstallationId) return;

    const existing = await this.installationRepository.findOne({
      where: { github_installation_id: githubInstallationId },
    });

    if (!existing) {
      await this.installationRepository.save({
        github_installation_id: githubInstallationId,
        github_account_login: payload.installation.account?.login,
        github_account_type: payload.installation.account?.type || 'User',
        llm_provider: 'openai',
        isActive: true,
      });

      this.logger.log({ githubInstallationId }, 'Created installation record');
    }
  }
}
