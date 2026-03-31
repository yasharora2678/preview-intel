import { ICommand } from '@nestjs/cqrs';
import { ReviewIssue } from 'src/features/llm/review-provider.interface';


export class SaveReviewIssuesCommand implements ICommand {
  constructor(
    public readonly reviewId: string,
    public readonly issues: ReviewIssue[],
  ) {}
}