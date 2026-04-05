import { Module } from '@nestjs/common';
import { RepositoriesService } from './update-repository.service';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';
import { RepositoriesController } from './update-repository.controller';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { PullRequestRepository } from 'src/infrastructure/repositories/pull-request.repository';
import { AppCqrsModule } from 'src/infrastructure/cqrs/cqrs.module';

@Module({
  imports: [AppCqrsModule],
  controllers: [RepositoriesController],
  providers: [
    RepositoriesService,
    GithubRepository,
    InstallationRepository,
    CacheService,
    PullRequestRepository,
  ],
  exports: [
    RepositoriesService,
    GithubRepository,
    InstallationRepository,
    PullRequestRepository,
  ],
})
export class UpdateRepositoryModule {}
