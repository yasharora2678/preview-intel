import { Module } from '@nestjs/common';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';
import { GetInstallationsController } from './get-installation.controller';
import { GetInstallationsHandler } from './get-installation.service';

@Module({
  controllers: [GetInstallationsController],
  providers: [GetInstallationsHandler, InstallationRepository],
  exports: [GetInstallationsHandler, InstallationRepository],
})
export class GetInstallationModule {}
