import { IsArray, IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType } from '../entities/service-type.enum';

class LineupSongDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsUUID()
  singerId?: string;
}

class LineupMemberDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  instrumentRoleId: string;

  @IsOptional()
  @IsString()
  customRoleName?: string;
}

export class CreateWorshipLineupDto {
  @IsArray()
  @IsString({ each: true })
  dates: string[];

  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsOptional()
  @IsString()
  customServiceName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineupMemberDto)
  members: LineupMemberDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineupSongDto)
  songs?: LineupSongDto[];
}
