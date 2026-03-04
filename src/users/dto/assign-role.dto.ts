import { IsEnum } from 'class-validator';
import { RoleName } from '../entities/role.enum';

export class AssignRoleDto {
  @IsEnum(RoleName)
  role: RoleName;
}
