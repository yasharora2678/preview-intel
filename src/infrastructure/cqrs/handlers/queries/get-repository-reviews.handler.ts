import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { GetRepositoryReviewsQuery } from '../../queries/get-repository-reviews.query';
import { CacheService } from 'src/features/cache/cache.service';
import { ReviewsRepository } from 'src/infrastructure/repositories/review-repository';


@QueryHandler(GetRepositoryReviewsQuery)
export class GetRepositoryReviewsHandler
  implements IQueryHandler<GetRepositoryReviewsQuery>
{
  constructor(
    @InjectRepository(ReviewsRepository)
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
      .where('pr.repositoryId = :repoId', { repoId: query.repositoryId })
      .select([
        'review.id',
        'review.status',
        'review.score',
        'review.llmProvider',
        'review.createdAt',
        'pr.githubPrNumber',
        'pr.title',
        'pr.authorGithubLogin',
        'pr.githubPrUrl',
      ])
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(*)', 'issue_count')
            .from('review_issues', 'ri')
            .where('ri.review_id = review.id'),
        'review_issue_count',
      )
      .orderBy('review.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    // Apply filters
    if (query.filters?.authorLogin) {
      qb.andWhere('pr.authorGithubLogin = :author', {
        author: query.filters.authorLogin,
      });
    }
    if (query.filters?.minScore !== undefined) {
      qb.andWhere('review.score >= :minScore', { minScore: query.filters.minScore });
    }
    if (query.filters?.maxScore !== undefined) {
      qb.andWhere('review.score <= :maxScore', { maxScore: query.filters.maxScore });
    }
    if (query.filters?.dateFrom) {
      qb.andWhere('review.createdAt >= :dateFrom', { dateFrom: query.filters.dateFrom });
    }
    if (query.filters?.dateTo) {
      qb.andWhere('review.createdAt <= :dateTo', { dateTo: query.filters.dateTo });
    }

    const [items, total] = await qb.getManyAndCount();

    const result = { items, total, page: query.page, limit: query.limit };

    // Cache for 2 minutes (reviews change frequently)
    await this.cacheService.set(cacheKey, result, 120);

    return result;
  }
}