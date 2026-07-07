import { Module } from '@nestjs/common';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';
import { AddApiKeyToInstallationsHandler } from './add-api-key-to-installation.service';

@Module({
  controllers: [],
  providers: [AddApiKeyToInstallationsHandler, InstallationRepository],
  exports: [AddApiKeyToInstallationsHandler, InstallationRepository],
})
export class AddApiKeyToInstallationsModule {}
