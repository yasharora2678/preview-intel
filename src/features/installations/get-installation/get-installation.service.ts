import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';
import { User } from 'src/domain/user.entity';

@Injectable()
export class GetInstallationsHandler {
  constructor(
    @InjectRepository(InstallationRepository)
    private readonly installationRepository: InstallationRepository,
  ) {}

  async findAllForUser(user: User) {
    return this.installationRepository.find({
      where: { user_id: user.id, is_active: true },
      relations: ['repositories'],
      order: { created_at: 'DESC' },
    });
  }
}
