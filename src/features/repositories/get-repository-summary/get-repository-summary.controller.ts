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
import { GetRepositorySummaryService } from './get-repository-summary.service';

@Controller({ path: 'repositories', version: '1' })
@UseGuards(JwtAuthGuard)
export class GetRepositorySummaryController {
  constructor(
    private readonly getRepositorySummaryService: GetRepositorySummaryService,
  ) {}

  @Get(':id/summary')
  public async handle(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const summary = await this.getRepositorySummaryService.handle(id, user);
    return { data: summary };
  }
}
