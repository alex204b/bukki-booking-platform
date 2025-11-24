import { IsString, IsInt, IsOptional, Min, Max, Length } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  businessId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @Length(1, 255)
  title: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  comment?: string;
}

export class UpdateReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  comment?: string;
}

export class ReviewResponseDto {
  id: string;
  businessId: string;
  userId: string;
  rating: number;
  title: string;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}
