import { Module } from '@nestjs/common';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { FindRepositoryController } from './find-repository.controller';
import { FindRepositoryService } from './find-repository.service';

@Module({
  controllers: [FindRepositoryController],
  providers: [FindRepositoryService, GithubRepository],
  exports: [FindRepositoryService, GithubRepository],
})
export class FindRepositoryModule {}
