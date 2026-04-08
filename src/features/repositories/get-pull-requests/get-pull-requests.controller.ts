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
import { GetPullRequestsService } from './get-pull-requests.service';
import { PaginationDto } from 'src/infrastructure/dto/pagination.dto';

@Controller({ path: 'repositories', version: '1' })
@UseGuards(JwtAuthGuard)
export class GetPullRequestsController {
  constructor(
    private readonly getPullRequestsService: GetPullRequestsService,
  ) {}

  @Get(':id/pull-requests')
  public async handle(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query() pagination: PaginationDto,
  ) {
    const result = await this.getPullRequestsService.handle(
      id,
      user,
      pagination,
    );
    return {
      data: result.items,
      meta: { total: result.total, page: result.page, limit: result.limit },
    };
  }
}
