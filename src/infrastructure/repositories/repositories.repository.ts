import { Injectable } from '@nestjs/common';
import { Repository } from 'src/domain/repository.entity';
import { DataSource, Repository as TypeOrmRepository } from 'typeorm';

@Injectable()
export class GithubRepository extends TypeOrmRepository<Repository> {
  constructor(dataSource: DataSource) {
    super(Repository, dataSource.createEntityManager());
  }
}
