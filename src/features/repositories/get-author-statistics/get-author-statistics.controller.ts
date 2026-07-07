import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/infrastructure/decorators/current-user.decorator';
import { User } from 'src/domain/user.entity';
import { GetAuthorStatisticsService } from './get-author-statistics.service';

@Controller({ path: 'repositories', version: '1' })
@UseGuards(JwtAuthGuard)
export class GetAuthorStatisticsController {
  constructor(
    private readonly getAuthorStatisticsService: GetAuthorStatisticsService,
  ) {}

  @Get(':id/analytics/author-stats')
  public async handle(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.getAuthorStatisticsService.handle(id, user);
    return { data };
  }
}
