import { IsString, MinLength, IsDateString, IsOptional } from 'class-validator';

export class UpdateWorshipScheduleDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;
}
