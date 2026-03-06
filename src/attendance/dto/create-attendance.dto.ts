import {
  IsString,
  IsUUID,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceEntryDto {
  @IsUUID()
  youthProfileId: string;

  @IsBoolean()
  present: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAttendanceDto {
  @IsString()
  date: string;

  @IsUUID()
  stationId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}
