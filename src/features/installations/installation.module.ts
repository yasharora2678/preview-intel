import { Module } from '@nestjs/common';
import { AddApiKeyToInstallationsModule } from './add-api-key-to-installation/add-api-key-to-installation.module';
import { CreateInstallationModule } from './create-installation/create-installation.module';
import { GetInstallationModule } from './get-installation/get-installation.module';

@Module({
  imports: [
    AddApiKeyToInstallationsModule,
    CreateInstallationModule,
    GetInstallationModule,
  ],
  providers: [],
  exports: [],
})
export class InstallationModule {}
