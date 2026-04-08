import { Module } from '@nestjs/common';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { GetRepositoryController } from './get-repository.controller';
import { GetRepositoryService } from './get-repository.service';

@Module({
  controllers: [GetRepositoryController],
  providers: [GetRepositoryService, GithubRepository],
  exports: [GetRepositoryService, GithubRepository],
})
export class GetRepositoryModule {}
