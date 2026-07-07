import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { RepositoriesService } from './update-repository.service';
import { CurrentUser } from 'src/infrastructure/decorators/current-user.decorator';
import { User } from 'src/domain/user.entity';
import { UpdateRepositoryDto } from './update-repository.dto';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';

@Controller({ path: 'repositories', version: '1' })
@UseGuards(JwtAuthGuard)
export class RepositoriesController {
  constructor(private readonly repoService: RepositoriesService) {}

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
}
