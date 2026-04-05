import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/infrastructure/decorators/current-user.decorator';
import { User } from 'src/domain/user.entity';
import { AddApiKeyToInstallationsHandler } from './add-api-key-to-installation.service';
import { UpdateApiKeyDto } from '../dto/update-api-key.dto';

@Controller('v1/installations')
@UseGuards(JwtAuthGuard)
export class AddApiKeyToInstallationsController {
  constructor(
    private readonly addApiKeyToInstallationsHandler: AddApiKeyToInstallationsHandler,
  ) {}

  @Patch(':id/api-key')
  async updateApiKey(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateApiKeyDto,
  ) {
    await this.addApiKeyToInstallationsHandler.updateApiKey(id, dto, user);
    return { data: { message: 'API key updated successfully' } };
  }
}
