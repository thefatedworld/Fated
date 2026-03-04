import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateEpisodeDto {
  @ApiPropertyOptional({ example: 'The Awakening — Director\'s Cut' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isGated?: boolean;

  @ApiPropertyOptional({ description: 'Token cost to unlock (0 = free)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  tokenCost?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  durationSeconds?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
