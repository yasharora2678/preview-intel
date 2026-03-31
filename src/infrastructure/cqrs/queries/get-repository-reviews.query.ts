import { IQuery } from '@nestjs/cqrs';

export class GetRepositoryReviewsQuery implements IQuery {
  constructor(
    public readonly repositoryId: string,
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly filters?: {
      authorLogin?: string;
      minScore?: number;
      maxScore?: number;
      severity?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ) {}
}