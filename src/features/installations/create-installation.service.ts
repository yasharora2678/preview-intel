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
        github_account_login: payload.repository.owner.login,
        // user_id: payload.repository.owner.id,
        github_account_type: payload.repository.owner.type,
        llm_provider: 'groq',
        isActive: true,
      });

      this.logger.log({ githubInstallationId }, 'Created installation record');
    }
  }
}
