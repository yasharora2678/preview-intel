import {
  IsBoolean,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';

export class UpdateRepositoryDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  skipDrafts?: boolean;

  @IsOptional()
  @IsBoolean()
  skipBots?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skipFilePatterns?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  scoreFailureThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  scoreSuccessThreshold?: number;

  @IsOptional()
  @IsString()
  llmProvider?: string;
}
