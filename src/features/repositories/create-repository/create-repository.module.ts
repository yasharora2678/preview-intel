import { Module } from '@nestjs/common';
import { CreateRepositoryHandler } from './create-repository.service';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';

@Module({
  controllers: [],
  providers: [CreateRepositoryHandler, GithubRepository, InstallationRepository],
  exports: [CreateRepositoryHandler, GithubRepository, InstallationRepository],
})
export class CreateRepositoryModule {}
