import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateReviewStatusCommand } from '../../commands/update-review-status.command';
import { CacheService } from 'src/features/cache/cache.service';
import { ReviewsRepository } from 'src/infrastructure/repositories/review-repository';


@CommandHandler(UpdateReviewStatusCommand)
export class UpdateReviewStatusHandler
  implements ICommandHandler<UpdateReviewStatusCommand>
{
  constructor(
    @InjectRepository(ReviewsRepository)
    private readonly reviewsRepository: ReviewsRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(command: UpdateReviewStatusCommand): Promise<void> {
    await this.reviewsRepository.update(command.reviewId, {
      status: command.status,
      ...command.updates,
    });

    // Invalidate the cached review detail
    await this.cacheService.del(
      this.cacheService.keys.reviewDetail(command.reviewId),
    );
  }
}