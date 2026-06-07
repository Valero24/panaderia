import { IsBoolean, IsOptional } from "class-validator";

export class UpdateReviewFeaturedDto {
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
