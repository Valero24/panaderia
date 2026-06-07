import {
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";

export class SubmitReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @Length(10, 1200)
  comment: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  title?: string;

  @IsOptional()
  @IsObject()
  categoryRatings?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  publicName?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;
}
