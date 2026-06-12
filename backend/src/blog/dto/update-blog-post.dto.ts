import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";

export class UpdateBlogPostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  tags?: unknown;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  seoKeywords?: unknown;

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsString()
  publishedAt?: string;

  @IsOptional()
  relatedDestinationSlugs?: unknown;

  @IsOptional()
  relatedPropertySlugs?: unknown;

  @IsOptional()
  relatedExperienceSlugs?: unknown;

  @IsOptional()
  relatedPackageSlugs?: unknown;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsObject()
  translations?: Record<string, Record<string, unknown>>;
}
