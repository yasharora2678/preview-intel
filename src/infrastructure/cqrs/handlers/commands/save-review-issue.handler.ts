import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SaveReviewIssuesCommand } from '../../commands/save-review-issues.command';
import { ReviewIssueRepository } from 'src/infrastructure/repositories/review-issue.repository';


@CommandHandler(SaveReviewIssuesCommand)
export class SaveReviewIssuesHandler
  implements ICommandHandler<SaveReviewIssuesCommand>
{
  constructor(
    private readonly reviewIssueRepository: ReviewIssueRepository,
  ) {}

  async execute(command: SaveReviewIssuesCommand): Promise<void> {
    if (!command.issues.length) return;

    const entities = command.issues.map((issue) =>
      this.reviewIssueRepository.create({
        review_id: command.reviewId,
        type: issue.type,
        severity: issue.severity,
        file_path: issue.file,
        line_number: issue.line || null,
        description: issue.description,
        suggestion: issue.suggestion,
      }),
    );

    // Bulk insert — much faster than individual saves
    await this.reviewIssueRepository.insert(entities);
  }
}