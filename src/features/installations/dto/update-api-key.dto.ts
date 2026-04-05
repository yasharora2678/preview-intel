import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsIn(['openai', 'groq', 'anthropic', 'huggingface'])
  provider: string;
}