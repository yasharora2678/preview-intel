import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as RepoEntity } from 'src/domain/repository.entity';
import { User } from 'src/domain/user.entity';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { UpdateRepositoryDto } from './update-repository.dto';
import { FindRepositoryService } from '../find-repository/find-repository.service';

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name);

  constructor(
    @InjectRepository(GithubRepository)
    private readonly githubRepository: GithubRepository,
    private readonly cacheService: CacheService,
    private readonly findRepositoryService: FindRepositoryService,
  ) {}

  async updateSettings(
    repoId: string,
    user: User,
    dto: UpdateRepositoryDto,
  ): Promise<RepoEntity> {
    const repo = await this.findRepositoryService.handle(repoId, user);

    await this.githubRepository.update(
      { id: repo.id },
      {
        ...(dto.isEnabled !== undefined && { is_enabled: dto.isEnabled }),
        ...(dto.skipDrafts !== undefined && { skip_drafts: dto.skipDrafts }),
        ...(dto.skipBots !== undefined && { skip_bots: dto.skipBots }),
        ...(dto.skipFilePatterns !== undefined && {
          skip_file_patterns: dto.skipFilePatterns,
        }),
        ...(dto.scoreFailureThreshold !== undefined && {
          score_failure_threshold: dto.scoreFailureThreshold,
        }),
        ...(dto.scoreSuccessThreshold !== undefined && {
          score_success_threshold: dto.scoreSuccessThreshold,
        }),
      },
    );

    // Invalidate repo-related cache
    await this.cacheService.invalidatePattern(`repo:${repo.id}:`);

    this.logger.log({
      msg: 'Repository settings updated',
      repoId,
      updatedBy: user.github_username,
      changes: dto,
    });

    return this.githubRepository.findOne({ where: { id: repoId } });
  }
}
