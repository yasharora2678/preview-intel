import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { RepositoriesService } from './update-repository.service';
import { CurrentUser } from 'src/infrastructure/decorators/current-user.decorator';
import { User } from 'src/domain/user.entity';
import { UpdateRepositoryDto } from './update-repository.dto';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { PaginationDto } from 'src/infrastructure/dto/pagination.dto';

@Controller({ path: 'repositories', version: '1' })
@UseGuards(JwtAuthGuard)
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
    const updated = await this.repoService.updateSettings(id, user, {
      isEnabled: true,
    });
    return { data: updated };
  }

  @Post(':id/disable')
  async disable(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const updated = await this.repoService.updateSettings(id, user, {
      isEnabled: false,
    });
    return { data: updated };
  }

  @Get(':id/pull-requests')
  async getPullRequests(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query() pagination: PaginationDto,
  ) {
    const result = await this.repoService.getPullRequestsForRepo(
      id,
      user,
      pagination,
    );
    return {
      data: result.items,
      meta: { total: result.total, page: result.page, limit: result.limit },
    };
  }

  @Get(':id/analytics/score-trend')
  async getScoreTrend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query('period') period: '7d' | '30d' | '90d' | 'all' = '30d',
  ) {
    const data = await this.repoService.getScoreTrend(id, user, period);
    return { data };
  }

  @Get(':id/analytics/issue-distribution')
  async getIssueDistribution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.repoService.getIssueDistribution(id, user);
    return { data };
  }

  @Get(':id/analytics/author-stats')
  async getAuthorStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.repoService.getAuthorStats(id, user);
    return { data };
  }
}
