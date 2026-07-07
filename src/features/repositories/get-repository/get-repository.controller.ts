import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/infrastructure/decorators/current-user.decorator';
import { User } from 'src/domain/user.entity';
import { GetRepositoryService } from './get-repository.service';

@Controller({ path: 'repositories', version: '1' })
@UseGuards(JwtAuthGuard)
export class GetRepositoryController {
  constructor(private readonly getRepositoryService: GetRepositoryService) {}

  @Get()
  public async handle(@CurrentUser() user: User) {
    const repos = await this.getRepositoryService.handle(user);
    return { data: repos, meta: { total: repos.length } };
  }
}
