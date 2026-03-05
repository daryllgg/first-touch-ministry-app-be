import { IsEnum } from 'class-validator';
import { LineupStatus } from '../entities/lineup-status.enum';

export class UpdateLineupStatusDto {
  @IsEnum(LineupStatus)
  status: LineupStatus;
}
