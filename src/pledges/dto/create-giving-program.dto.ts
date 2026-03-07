import { IsString, IsEnum, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { ProgramType } from '../entities/program-type.enum';

export class CreateGivingProgramDto {
  @IsString()
  name: string;

  @IsEnum(ProgramType)
  type: ProgramType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  conductedDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  programMonths?: string[];
}
