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
import { FindRepositoryService } from './find-repository.service';

@Controller({ path: 'repositories', version: '1' })
@UseGuards(JwtAuthGuard)
export class FindRepositoryController {
  constructor(private readonly findRepositoryService: FindRepositoryService) {}

  @Get(':id')
  public async handle(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const repo = await this.findRepositoryService.handle(id, user);
    return { data: repo };
  }
}
