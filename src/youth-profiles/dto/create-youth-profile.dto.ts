import { IsString, IsEnum, IsOptional, IsDateString, IsUUID, Matches } from 'class-validator';
import { Gender } from '../entities/gender.enum';

export class CreateYouthProfileDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsDateString()
  birthDate: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsUUID()
  stationId?: string;

  @IsOptional()
  @IsString()
  motherName?: string;

  @IsOptional()
  @IsString()
  fatherName?: string;

  @IsOptional()
  @IsString()
  facebookLink?: string;

  @IsString()
  @Matches(/^\+639\d{9}$/)
  contactNumber: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
