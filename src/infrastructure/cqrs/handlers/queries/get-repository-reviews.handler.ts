import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetRepositoryReviewsQuery } from '../../queries/get-repository-reviews.query';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { ReviewsRepository } from 'src/infrastructure/repositories/review-repository';


@QueryHandler(GetRepositoryReviewsQuery)
export class GetRepositoryReviewsHandler
  implements IQueryHandler<GetRepositoryReviewsQuery>
{
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: GetRepositoryReviewsQuery) {
    const cacheKey = this.cacheService.keys.repoReviews(
      query.repositoryId,
      query.page,
      query.limit,
    );

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Build query
    const qb = this.reviewsRepository
      .createQueryBuilder('review')
      .innerJoin('review.pullRequest', 'pr')
      .where('pr.repository_id = :repoId', { repoId: query.repositoryId })
      .select([
        'review.id',
        'review.status',
        'review.score',
        'review.llm_provider',
        'review.created_at',
        'pr.github_pr_number',
        'pr.title',
        'pr.author_login',
        'pr.github_pr_url',
      ])
      .loadRelationCountAndMap('review.issueCount', 'review.issues')
      // FIX 1: snake_case for orderBy
      .orderBy('review.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    // Apply filters
    if (query.filters?.authorLogin) {
      qb.andWhere('pr.author_login = :author', {
        author: query.filters.authorLogin,
      });
    }
    if (query.filters?.minScore !== undefined && !isNaN(query.filters.minScore)) {
      qb.andWhere('review.score >= :minScore', { minScore: query.filters.minScore });
    }
    if (query.filters?.maxScore !== undefined && !isNaN(query.filters.maxScore)) {
      qb.andWhere('review.score <= :maxScore', { maxScore: query.filters.maxScore });
    }
    if (query.filters?.dateFrom) {
      qb.andWhere('review.created_at >= :dateFrom', { dateFrom: query.filters.dateFrom });
    }
    if (query.filters?.dateTo) {
      qb.andWhere('review.created_at <= :dateTo', { dateTo: query.filters.dateTo });
    }

    // getManyAndCount() now works correctly — no correlated subquery conflict
    const [items, total] = await qb.getManyAndCount();

    const result = { items, total, page: query.page, limit: query.limit };
    await this.cacheService.set(cacheKey, result, 120);

    return result;
  }
}