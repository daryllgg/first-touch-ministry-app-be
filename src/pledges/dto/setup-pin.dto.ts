import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class SetupPinDto {
  @IsString()
  @MinLength(4)
  @MaxLength(6)
  @Matches(/^\d+$/, { message: 'PIN must contain only digits' })
  pin: string;
}
