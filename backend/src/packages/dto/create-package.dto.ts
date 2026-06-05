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

export class CreatePackageImageDto {
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

export class CreatePackageComponentDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  translations?: Record<string, Record<string, string>>;

  @IsOptional()
  @IsString()
  includes?: string;

  @IsOptional()
  @IsString()
  excludes?: string;

  @IsOptional()
  @IsString()
  conditions?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceCop?: number;

  @IsOptional()
  @IsString()
  baseCurrency?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreatePackageDto {
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
  duration!: string;

  @IsString()
  location!: string;

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

  @IsOptional()
  @IsString()
  mainImage?: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  includes?: string;

  @IsOptional()
  @IsString()
  notIncludes?: string;

  @IsOptional()
  @IsString()
  itinerary?: string;

  @IsOptional()
  @IsString()
  policies?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  images?: CreatePackageImageDto[];

  @IsOptional()
  @IsArray()
  components?: CreatePackageComponentDto[];
}
