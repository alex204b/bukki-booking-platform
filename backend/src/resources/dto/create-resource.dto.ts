import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsObject, Min } from 'class-validator';
import { ResourceType } from '../entities/resource.entity';

export class CreateResourceDto {
  @IsString()
  name: string;

  @IsEnum(ResourceType)
  type: ResourceType;

  @IsString()
  businessId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  workingHours?: {
    [key: string]: {
      isOpen: boolean;
      openTime?: string;
      closeTime?: string;
    };
  };

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
