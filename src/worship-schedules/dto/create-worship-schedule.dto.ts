import { IsString, MinLength, IsDateString, IsOptional } from 'class-validator';

export class CreateWorshipScheduleDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  scheduledDate: string;
}
