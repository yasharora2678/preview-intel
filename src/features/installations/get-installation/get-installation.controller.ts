import { Controller, Get, UseGuards } from '@nestjs/common';
import { GetInstallationsHandler } from './get-installation.service';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/infrastructure/decorators/current-user.decorator';
import { User } from 'src/domain/user.entity';

@Controller('v1/installations')
@UseGuards(JwtAuthGuard)
export class GetInstallationsController {
  constructor(
    private readonly getInstallationsHandler: GetInstallationsHandler,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    const installations =
      await this.getInstallationsHandler.findAllForUser(user);
    return { data: installations, meta: { total: installations.length } };
  }
}
