import { ICommand } from '@nestjs/cqrs';
import { ReviewStatus } from 'src/domain/review-status.enum';

export class UpdateReviewStatusCommand implements ICommand {
  constructor(
    public readonly reviewId: string,
    public readonly status: ReviewStatus,
    public readonly updates?: {
      score?: number;
      summary?: string;
      missingTests?: boolean;
      breakingChange?: boolean;
      githubReviewId?: number;
      processingStartedAt?: Date;
      processingCompletedAt?: Date;
    },
  ) {}
}