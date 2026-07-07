import { IQuery } from '@nestjs/cqrs';

export class GetReviewDetailQuery implements IQuery {
  constructor(
    public readonly reviewId: string,
    public readonly userId: string,
  ) {}
}
