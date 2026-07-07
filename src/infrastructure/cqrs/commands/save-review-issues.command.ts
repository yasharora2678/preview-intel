import { ICommand } from '@nestjs/cqrs';
import { ReviewIssue } from 'src/domain/review/review-provider.interface';

export class SaveReviewIssuesCommand implements ICommand {
  constructor(
    public readonly reviewId: string,
    public readonly issues: ReviewIssue[],
  ) {}
}
