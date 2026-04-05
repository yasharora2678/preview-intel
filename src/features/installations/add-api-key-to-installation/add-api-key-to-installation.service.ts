import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';
import { User } from 'src/domain/user.entity';
import { EncryptionService } from 'src/shared/encryption-service';
import { UpdateApiKeyDto } from '../dto/update-api-key.dto';

@Injectable()
export class AddApiKeyToInstallationsHandler {
  constructor(
    private readonly encryption: EncryptionService,
    @InjectRepository(InstallationRepository)
    private readonly installationRepository: InstallationRepository,
  ) {}

  // Add method:
  async updateApiKey(
    installationId: string,
    dto: UpdateApiKeyDto,
    user: User,
  ): Promise<void> {
    const installation = await this.installationRepository.findOne({
      where: { id: installationId },
    });

    if (!installation) throw new NotFoundException('Installation not found');

    // Only the user who owns this installation can update its key
    if (installation.user_id !== user.id) {
      throw new ForbiddenException(
        'You do not have access to this installation',
      );
    }

    const encrypted = this.encryption.encrypt(dto.apiKey);

    await this.installationRepository.update(
      { id: installationId },
      {
        llm_api_key_encrypted: encrypted,
        llm_provider: dto.provider,
      },
    );
  }
}
