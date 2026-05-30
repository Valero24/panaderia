import {
  IsString,
  IsNumber,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsArray,
} from "class-validator";
import { MediaType } from "@prisma/client";

export enum PropertyStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  FEATURED = "FEATURED",
  MAINTENANCE = "MAINTENANCE",
  ARCHIVED = "ARCHIVED",
}

export class CreatePropertyImageDto {
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

export class CreatePropertyDto {
  //////////////////////////////////////////////////////
  // OVERVIEW
  //////////////////////////////////////////////////////

  @IsString()
  title!: string;

  @IsString()
  slug!: string;

  @IsString()
  description!: string;

  @IsString()
  city!: string;

  @IsString()
  area!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  icalUrl?: string;

  @IsEnum(PropertyStatus)
  status!: PropertyStatus;

  //////////////////////////////////////////////////////
  // PRICING
  //////////////////////////////////////////////////////

  @IsNumber()
  pricePerNight!: number;

  @IsNumber()
  basePrice!: number;

  @IsOptional()
  @IsNumber()
  cleaningFee?: number;

  @IsOptional()
  @IsNumber()
  serviceFee?: number;

  @IsOptional()
  @IsNumber()
  taxes?: number;

  @IsOptional()
  @IsNumber()
  highSeasonPrice?: number;

  @IsOptional()
  @IsNumber()
  lowSeasonPrice?: number;

  @IsOptional()
  @IsNumber()
  twoGuestsIncrease?: number;

  @IsOptional()
  @IsNumber()
  extraGuestIncrease?: number;

  //////////////////////////////////////////////////////
  // CAPACITY
  //////////////////////////////////////////////////////

  @IsInt()
  maxGuests!: number;

  @IsInt()
  maxCapacity!: number;

  @IsOptional()
  @IsInt()
  bedrooms?: number;

  @IsOptional()
  @IsInt()
  bathrooms?: number;

  @IsOptional()
  @IsInt()
  minimumNights?: number;

  //////////////////////////////////////////////////////
  // RULES
  //////////////////////////////////////////////////////

  @IsOptional()
  @IsBoolean()
  allowsPets?: boolean;

  @IsOptional()
  @IsBoolean()
  allowsSmoking?: boolean;

  @IsOptional()
  @IsBoolean()
  allowsEvents?: boolean;

  @IsOptional()
  @IsBoolean()
  allowsChildren?: boolean;

  @IsOptional()
  @IsString()
  checkInTime?: string;

  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  //////////////////////////////////////////////////////
  // GEO
  //////////////////////////////////////////////////////

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  //////////////////////////////////////////////////////
  // SEO
  //////////////////////////////////////////////////////

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  //////////////////////////////////////////////////////
  // INTERNAL
  //////////////////////////////////////////////////////

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsArray()
  images?: CreatePropertyImageDto[];
}
