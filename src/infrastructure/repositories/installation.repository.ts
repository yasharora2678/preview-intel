import { Injectable } from '@nestjs/common';
import { Installation } from 'src/domain/installation.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class InstallationRepository extends Repository<Installation> {
  constructor(dataSource: DataSource) {
    super(Installation, dataSource.createEntityManager());
  }
}
