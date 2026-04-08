import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/infrastructure/decorators/current-user.decorator';
import { User } from 'src/domain/user.entity';
import { GetScoreTrendService } from './get-score-trend.service';

@Controller({ path: 'repositories', version: '1' })
@UseGuards(JwtAuthGuard)
export class GetScoreTrendController {
  constructor(
    private readonly getScoreTrendService: GetScoreTrendService,
  ) {}

  @Get(':id/analytics/score-trend')
  public async handle(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query('period') period: '7d' | '30d' | '90d' | 'all' = '30d',
  ) {
    const data = await this.getScoreTrendService.handle(id, user, period);
    return { data };
  }
}
