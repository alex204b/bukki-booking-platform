import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsBoolean, IsObject, Min, Max } from 'class-validator';

export class CreateOfferDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  @IsString()
  discountCode?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: {
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    applicableServices?: string[];
    termsAndConditions?: string;
  };
}

