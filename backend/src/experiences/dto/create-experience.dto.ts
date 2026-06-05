import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { MediaType } from "@prisma/client";

export class CreateExperienceImageDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateExperienceDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  shortDescription!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsObject()
  translations?: Record<string, Record<string, string>>;

  @IsString()
  location!: string;

  @IsString()
  duration!: string;

  @IsInt()
  @Min(1)
  maxGuests!: number;

  @IsNumber()
  @Min(0)
  basePrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceCop?: number;

  @IsOptional()
  @IsString()
  baseCurrency?: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  mainImage?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  policies?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsArray()
  images?: CreateExperienceImageDto[];
}
