import { IsEmail, IsString, MinLength, IsOptional, IsEnum, Matches, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { Gender } from '../../users/entities/gender.enum';

export class RegisterDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+639\d{9}$/, { message: 'Contact number must be in +639XXXXXXXXX format' })
  contactNumber?: string;

  @IsNotEmpty()
  @IsString()
  birthday: string;

  @IsNotEmpty()
  @IsEnum(Gender)
  gender: Gender;

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
