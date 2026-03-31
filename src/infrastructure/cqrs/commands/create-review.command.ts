import { ICommand } from '@nestjs/cqrs';

export class CreateReviewCommand implements ICommand {
  constructor(
    public readonly pullRequestId: string,
    public readonly headCommitSha: string,
    public readonly llmProvider: string,
    public readonly llmModel: string,
  ) {}
}