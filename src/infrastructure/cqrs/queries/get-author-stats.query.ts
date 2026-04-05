import { IQuery } from '@nestjs/cqrs';

export class GetAuthorStatsQuery implements IQuery {
  constructor(public readonly repositoryId: string) {}
}