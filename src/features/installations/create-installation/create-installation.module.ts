import { Module } from '@nestjs/common';
import { CreateInstallationHandler } from './create-installation.service';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';

@Module({
  controllers: [],
  providers: [CreateInstallationHandler, InstallationRepository],
  exports: [CreateInstallationHandler, InstallationRepository],
})
export class CreateInstallationModule {}
