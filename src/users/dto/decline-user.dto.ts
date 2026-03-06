import { IsOptional, IsString } from 'class-validator';

export class DeclineUserDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
