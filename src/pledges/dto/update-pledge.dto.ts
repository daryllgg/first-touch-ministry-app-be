import { IsNumber, IsOptional, IsString, IsInt, Min, IsObject } from 'class-validator';

export class UpdatePledgeDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  pledgeAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalMonths?: number;

  @IsOptional()
  @IsString()
  startMonth?: string;

  @IsOptional()
  @IsObject()
  monthlyAmounts?: Record<string, number>;

  @IsOptional()
  @IsString()
  notes?: string;
}
