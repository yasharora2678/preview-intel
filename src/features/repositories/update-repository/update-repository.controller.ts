import {
  Controller, Get, Patch, Post, Param,
  Body, ParseUUIDPipe,
} from '@nestjs/common';
import { RepositoriesService } from './update-repository.service';
import { CurrentUser } from 'src/infrastructure/decorators/current-user.decorator';
import { User } from 'src/domain/user.entity';
import { UpdateRepositoryDto } from './update-repository.dto';


@Controller('v1/repositories')
export class RepositoriesController {
  constructor(private readonly repoService: RepositoriesService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    const repos = await this.repoService.findAllForUser(user);
    return { data: repos, meta: { total: repos.length } };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const repo = await this.repoService.findOneForUser(id, user);
    return { data: repo };
  }

  @Get(':id/summary')
  async getSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const summary = await this.repoService.getRepoSummary(id, user);
    return { data: summary };
  }

  @Patch(':id/settings')
  async updateSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateRepositoryDto,
  ) {
    const updated = await this.repoService.updateSettings(id, user, dto);
    return { data: updated };
  }

  @Post(':id/enable')
  async enable(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const updated = await this.repoService.updateSettings(id, user, { isEnabled: true });
    return { data: updated };
  }

  @Post(':id/disable')
  async disable(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const updated = await this.repoService.updateSettings(id, user, { isEnabled: false });
    return { data: updated };
  }
}