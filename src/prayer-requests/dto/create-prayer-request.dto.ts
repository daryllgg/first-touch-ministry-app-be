import { IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { PrayerRequestVisibility } from '../entities/prayer-request-visibility.enum';

export class CreatePrayerRequestDto {
  @IsString()
  @MinLength(1)
  content: string;

  /** @deprecated visibility is no longer actively used; kept for backward compat */
  @IsEnum(PrayerRequestVisibility)
  @IsOptional()
  visibility?: PrayerRequestVisibility;
}
