import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateSeriesDto {
  @ApiProperty({ example: 'The Crimson Throne' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @ApiProperty({ example: 'crimson-throne', description: 'URL slug (auto-generated if omitted)' })
  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ['romantasy', 'enemies-to-lovers'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  genreTags?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  coverImageUrl?: string;
}
