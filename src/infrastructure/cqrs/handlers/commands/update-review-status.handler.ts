import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateReviewStatusCommand } from '../../commands/update-review-status.command';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { ReviewsRepository } from 'src/infrastructure/repositories/review-repository';

@CommandHandler(UpdateReviewStatusCommand)
export class UpdateReviewStatusHandler
  implements ICommandHandler<UpdateReviewStatusCommand>
{
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(command: UpdateReviewStatusCommand): Promise<void> {
    await this.reviewsRepository.update(command.reviewId, {
      status: command.status,
      ...command.updates,
    });

    await this.cacheService.del(
      this.cacheService.keys.reviewDetail(command.reviewId),
    );
  }
}