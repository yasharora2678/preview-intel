import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';

@Injectable()
export class CreateRepositoryHandler {
  private readonly logger = new Logger(CreateRepositoryHandler.name);

  constructor(
    @InjectRepository(GithubRepository)
    private readonly githubRepository: GithubRepository,
    @InjectRepository(InstallationRepository)
    private readonly installationRepository: InstallationRepository,
  ) {}

  public async handle(payload: any) {
    const githubRepoId = payload.repository?.id;
    if (!githubRepoId) return;

    const existingRepositry = await this.githubRepository.findOne({
      where: { github_repo_id: githubRepoId },
    });

    if (existingRepositry) {
      await this.githubRepository.update({id: existingRepositry.id}, {
        full_name: payload.repository.full_name,
        default_branch: payload.repository.default_branch,
      });
      return;
    }

    const installation = await this.installationRepository.findOne({
      where: { github_installation_id: payload.installation?.id },
    });
    if (!installation) return;

    await this.githubRepository.save({
      installation_id: installation.id,
      github_repo_id: githubRepoId,
      full_name: payload.repository.full_name,
      default_branch: payload.repository.default_branch,
      is_enabled: true,
      skip_drafts: true,
      skip_bots: true,
    });

    this.logger.log(
      { githubRepoId, fullName: payload.repository.full_name },
      'Created repository record',
    );
  }
}
