import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePinDto {
  @IsString()
  currentPin: string;

  @IsString()
  @MinLength(4)
  @MaxLength(6)
  @Matches(/^\d+$/, { message: 'PIN must contain only digits' })
  newPin: string;
}
