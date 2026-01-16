import { PartialType } from '@nestjs/mapped-types';
import { CreateResourceDto } from './create-resource.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateResourceDto extends PartialType(CreateResourceDto) {
  @IsOptional()
  @IsString()
  businessId?: string;
}
