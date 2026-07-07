import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'src/domain/repository.entity';
import { User } from 'src/domain/user.entity';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';

@Injectable()
export class FindRepositoryService {
  private readonly logger = new Logger(FindRepositoryService.name);

  constructor(
    @InjectRepository(GithubRepository)
    private readonly githubRepository: GithubRepository,
  ) {}

  public async handle(repositoryId: string, user: User): Promise<Repository> {
    const repository = await this.githubRepository.findOne({
      where: { id: repositoryId },
      relations: ['installation'],
    });

    if (!repository) {
      throw new NotFoundException('Repository not found');
    }

    if (repository.installation.user_id !== user.id) {
      throw new ForbiddenException('You do not have access to this repository');
    }

    return repository;
  }
}
