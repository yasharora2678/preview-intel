import { IQuery } from '@nestjs/cqrs';

export class GetScoreTrendQuery implements IQuery {
  constructor(
    public readonly repositoryId: string,
    public readonly period: '7d' | '30d' | '90d' | 'all',
  ) {}
}