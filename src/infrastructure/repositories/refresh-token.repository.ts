import { Injectable } from '@nestjs/common';
import { RefreshToken } from 'src/domain/refresh-token.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class RefreshTokenRepository extends Repository<RefreshToken> {
  constructor(dataSource: DataSource) {
    super(RefreshToken, dataSource.createEntityManager());
  }
}
