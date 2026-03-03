import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateEpisodeDto {
  @ApiProperty({ example: 'The Awakening' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isGated?: boolean;

  @ApiPropertyOptional({ default: 0, description: 'Token cost to unlock (0 = free)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  tokenCost?: number;

  @ApiPropertyOptional({ description: 'ISO8601 datetime for scheduled publish' })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  seasonId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
