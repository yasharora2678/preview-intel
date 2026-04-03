import {
  Injectable, NotFoundException, Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as RepoEntity } from 'src/domain/repository.entity';
import { User } from 'src/domain/user.entity';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { UpdateRepositoryDto } from './update-repository.dto';

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name);

  constructor(
    @InjectRepository(GithubRepository)
    private readonly githubRepository: GithubRepository,
    private readonly cacheService: CacheService,
  ) {}

  async findAllForUser(user: User): Promise<RepoEntity[]> {
    if (user.is_admin) {
      return this.githubRepository.find({
        relations: ['installation'],
        order: { created_at: 'DESC' },
      });
    }

    // Regular users only see repos from their own installations
    return this.githubRepository
      .createQueryBuilder('repo')
      .innerJoin('repo.installation', 'installation')
      .where('installation.user_id = :userId', { userId: user.id })
      .andWhere('installation.is_active = true')
      .orderBy('repo.created_at', 'DESC')
      .getMany();
  }

  async findOneForUser(repoId: string, user: User): Promise<RepoEntity> {
    const repo = await this.githubRepository.findOne({
      where: { id: repoId },
      relations: ['installation'],
    });

    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    // Authorization: admin sees all, regular users see only their own
    if (!user.is_admin && repo.installation.user_id !== user.id) {
      throw new ForbiddenException('You do not have access to this repository');
    }

    return repo;
  }

  async updateSettings(
    repoId: string,
    user: User,
    dto: UpdateRepositoryDto,
  ): Promise<RepoEntity> {
    const repo = await this.findOneForUser(repoId, user);

    await this.githubRepository.update({id: repo.id}, {
      ...(dto.isEnabled !== undefined && { is_enabled: dto.isEnabled }),
      ...(dto.skipDrafts !== undefined && { skip_drafts: dto.skipDrafts }),
      ...(dto.skipBots !== undefined && { skip_bots: dto.skipBots }),
      ...(dto.skipFilePatterns !== undefined && { skip_file_patterns: dto.skipFilePatterns }),
      ...(dto.scoreFailureThreshold !== undefined && {
        score_failure_threshold: dto.scoreFailureThreshold,
      }),
      ...(dto.scoreSuccessThreshold !== undefined && {
        score_success_threshold: dto.scoreSuccessThreshold,
      }),
    });

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

  async getRepoSummary(repoId: string, user: User) {
    await this.findOneForUser(repoId, user); // Auth check

    const cacheKey = this.cacheService.keys.repoSummary(repoId);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const result = await this.githubRepository
      .createQueryBuilder('repo')
      .select('repo.id', 'id')
      .addSelect('repo.full_name', 'fullName')
      .addSelect('COUNT(DISTINCT pr.id)', 'totalPrs')
      .addSelect('AVG(r.score)', 'avgScore')
      .addSelect('MAX(r.created_at)', 'lastReviewDate')
      .innerJoin('pull_requests', 'pr', 'pr.repository_id = repo.id')
      .innerJoin('reviews', 'r', 'r.pull_request_id = pr.id AND r.status = :status', {
        status: 'completed',
      })
      .where('repo.id = :repoId', { repoId })
      .getRawOne();

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }
}