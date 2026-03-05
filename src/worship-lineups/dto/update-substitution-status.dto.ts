import { IsEnum } from 'class-validator';
import { SubstitutionStatus } from '../entities/substitution-status.enum';

export class UpdateSubstitutionStatusDto {
  @IsEnum(SubstitutionStatus)
  status: SubstitutionStatus;
}
