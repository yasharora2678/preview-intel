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
import { GetIssueDistributionService } from './get-issue-distribution.service';

@Controller({ path: 'repositories', version: '1' })
@UseGuards(JwtAuthGuard)
export class GetIssueDistributionController {
  constructor(
    private readonly getIssueDistributionService: GetIssueDistributionService,
  ) {}

  @Get(':id/analytics/issue-distribution')
  public async handle(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.getIssueDistributionService.handle(id, user);
    return { data };
  }
}
