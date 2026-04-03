import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIProvider } from './providers/openai.provider';
import { GroqProvider } from './providers/groq.provider';
import * as crypto from 'crypto';
import { ReviewProvider } from '../../domain/review/review-provider.interface';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';
import { HuggingFaceProvider } from './providers/hugging-face.provider';
import { OpenRouterProvider } from './providers/openrouter-provider';

@Injectable()
export class LlmProviderFactory {
  private readonly logger = new Logger(LlmProviderFactory.name);

  constructor(
    private readonly config: ConfigService,
    private readonly installationRepository: InstallationRepository,
  ) {}

  /**
   * Returns the correct LLM provider for a given GitHub installation.
   * Each installation can have its own API key and provider choice.
   * Falls back to global env var keys if no per-installation key is set.
   */
  async getForInstallation(
    githubInstallationId: number,
  ): Promise<ReviewProvider> {
    const installation = await this.installationRepository.findOne({
      where: { github_installation_id: githubInstallationId },
    });

    const provider = installation?.llm_provider || 'groq';
    const encryptedKey = installation?.llm_api_key_encrypted;

    // Decrypt per-installation key, or fall back to global env key
    const apiKey = encryptedKey
      ? this.decryptKey(encryptedKey)
      : this.getGlobalKey(provider);

    this.logger.debug(
      {
        provider,
        installationId: githubInstallationId,
        hasCustomKey: !!encryptedKey,
      },
      'Resolved LLM provider',
    );

    switch (provider) {
      case 'groq':
        return new GroqProvider(apiKey);
      case 'openai':
        return new OpenAIProvider(apiKey);
      case 'huggingface':
        return new HuggingFaceProvider(apiKey);
      case 'openrouter':
        return new OpenRouterProvider(apiKey);
      default:
      this.logger.warn(`Unknown provider "${provider}", falling back to Groq`);
      return new GroqProvider(this.getGlobalKey('groq'));
    }
  }

  private getGlobalKey(provider: string): string {
    const keyMap: Record<string, string> = {
      openai: this.config.get('OPENAI_API_KEY') || '',
      groq: this.config.get('GROQ_API_KEY') || '',
      huggingface: this.config.get('HUGGINGFACE_API_KEY') || 'hf_XBXtUSkRBxAWVKoXerbwPOrnFroaiaAU',
      openrouter: this.config.get('OPENROUTER_API_KEY') || '',
    };
    const key = keyMap[provider];
    if (!key)
      throw new Error(`No API key configured for provider: ${provider}`);
    return key;
  }

  private decryptKey(encryptedKey: string): string {
    const encryptionKey = this.config.get<string>('ENCRYPTION_KEY')!;
    const keyBuffer = Buffer.from(encryptionKey, 'hex');

    // Format: iv:authTag:encrypted (all hex)
    const [ivHex, authTagHex, encryptedHex] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
