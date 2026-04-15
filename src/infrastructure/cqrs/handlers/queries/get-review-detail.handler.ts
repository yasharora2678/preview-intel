import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { GetReviewDetailQuery } from '../../queries/get-review-detail.query';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { ReviewsRepository } from 'src/infrastructure/repositories/review-repository';


@QueryHandler(GetReviewDetailQuery)
export class GetReviewDetailHandler
  implements IQueryHandler<GetReviewDetailQuery>
{
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: GetReviewDetailQuery) {
    const cacheKey = this.cacheService.keys.reviewDetail(query.reviewId);

    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const review = await this.reviewsRepository.findOne({
      where: { id: query.reviewId },
      relations: ['issues', 'pullRequest', 'pullRequest.repository'],
    });

    if (!review) {
      throw new NotFoundException(`Review ${query.reviewId} not found`);
    }

    if (review.status === 'completed') {
      await this.cacheService.set(cacheKey, review, 300);
    }

    return review;
  }
}