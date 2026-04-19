import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class AddApiKeyDto {
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsIn(['openai', 'groq', 'anthropic', 'huggingface', 'openrouter'])
  provider: string;
}
