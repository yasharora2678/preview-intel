import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'src/domain/repository.entity';
import { User } from 'src/domain/user.entity';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';

@Injectable()
export class GetRepositoryService {
  private readonly logger = new Logger(GetRepositoryService.name);

  constructor(
    @InjectRepository(GithubRepository)
    private readonly githubRepository: GithubRepository,
  ) {}

  public async handle(user: User): Promise<Repository[]> {
    if (user.is_admin) {
      return this.githubRepository.find({
        relations: ['installation'],
        order: { created_at: 'DESC' },
      });
    }

    return this.githubRepository
      .createQueryBuilder('repo')
      .innerJoin('repo.installation', 'installation')
      .where('installation.user_id = :userId', { userId: user.id })
      .andWhere('installation.is_active = true')
      .orderBy('repo.created_at', 'DESC')
      .getMany();
  }
}
