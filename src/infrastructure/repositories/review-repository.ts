import { Injectable } from '@nestjs/common';
import { Review } from 'src/domain/review.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ReviewsRepository extends Repository<Review> {
  constructor(dataSource: DataSource) {
    super(Review, dataSource.createEntityManager());
  }
}
