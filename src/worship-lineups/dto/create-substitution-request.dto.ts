import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateSubstitutionRequestDto {
  @IsUUID()
  lineupMemberId: string;

  @IsUUID()
  @IsOptional()
  substituteUserId?: string;

  @IsString()
  reason: string;
}
