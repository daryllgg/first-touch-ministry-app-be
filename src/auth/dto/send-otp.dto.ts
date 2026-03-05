import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendOtpDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;
}
