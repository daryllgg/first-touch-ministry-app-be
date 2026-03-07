import { IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { PaymentMethod } from '../entities/payment-method.enum';

export class CreatePaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  month?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
