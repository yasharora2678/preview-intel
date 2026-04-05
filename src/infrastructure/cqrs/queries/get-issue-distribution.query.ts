import { IQuery } from '@nestjs/cqrs';

export class GetIssueDistributionQuery implements IQuery {
  constructor(public readonly repositoryId: string) {}
}