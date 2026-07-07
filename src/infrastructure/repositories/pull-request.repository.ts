import { Injectable } from '@nestjs/common';
import { PullRequest } from 'src/domain/pull-request.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class PullRequestRepository extends Repository<PullRequest> {
  constructor(dataSource: DataSource) {
    super(PullRequest, dataSource.createEntityManager());
  }
}
