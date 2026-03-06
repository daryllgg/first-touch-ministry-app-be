import {
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsUUID,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  caption?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @IsArray()
  @IsUUID('4', { each: true })
  mentionedUserIds?: string[];

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @IsArray()
  @IsString({ each: true })
  removedImages?: string[];
}
