import { Module } from '@nestjs/common';
import { RepositoriesService } from './update-repository.service';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';
import { RepositoriesController } from './update-repository.controller';
import { CacheService } from 'src/infrastructure/cache/cache.service';

@Module({
  controllers: [RepositoriesController],
  providers: [RepositoriesService, GithubRepository, InstallationRepository, CacheService],
  exports: [RepositoriesService, GithubRepository, InstallationRepository],
})
export class UpdateRepositoryModule {}
