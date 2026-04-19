import { IQuery } from '@nestjs/cqrs';

export class GetAuthorStatisticsQuery implements IQuery {
  constructor(public readonly repositoryId: string) {}
}
