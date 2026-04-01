import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateReviewCommand } from '../../commands/create-review.command';
import { Review } from 'src/domain/review/review.entity';
import { ReviewStatus } from 'src/domain/review/review-status.enum';
import { ReviewsRepository } from 'src/infrastructure/repositories/review-repository';


@CommandHandler(CreateReviewCommand)
export class CreateReviewHandler implements ICommandHandler<CreateReviewCommand> {
  constructor(
    @InjectRepository(ReviewsRepository)
    private readonly reviewsRepository: ReviewsRepository,
  ) {}

  async execute(command: CreateReviewCommand): Promise<Review> {
    const review = this.reviewsRepository.create({
      pull_request_id: command.pullRequestId,
      head_commit_sha: command.headCommitSha,
      status: ReviewStatus.PENDING,
      llm_provider: command.llmProvider,
      llm_model: command.llmModel,
    });
    return this.reviewsRepository.save(review);
  }
}