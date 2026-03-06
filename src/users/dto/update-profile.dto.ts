import { IsOptional, IsString, IsEnum, Matches } from 'class-validator';
import { Gender } from '../entities/gender.enum';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+639\d{9}$/, { message: 'Contact number must be in +639XXXXXXXXX format' })
  contactNumber?: string;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  invitedBy?: string;

  @IsOptional()
  @IsString()
  facebookLink?: string;

  @IsOptional()
  @IsString()
  firstDateAttendedChurch?: string;

  @IsOptional()
  @IsString()
  dateBaptized?: string;
}
