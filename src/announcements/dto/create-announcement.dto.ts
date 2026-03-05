import { IsString, MinLength, IsOptional, IsEnum, IsArray, IsUUID } from 'class-validator';
import { AnnouncementAudience } from '../entities/announcement-audience.enum';

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsEnum(AnnouncementAudience)
  audience?: AnnouncementAudience;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mentionedUserIds?: string[];
}
