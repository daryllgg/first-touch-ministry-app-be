import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { AnnouncementAudience } from '../entities/announcement-audience.enum';

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsEnum(AnnouncementAudience)
  audience?: AnnouncementAudience;
}
