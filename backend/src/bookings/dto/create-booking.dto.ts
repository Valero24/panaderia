import { IsDateString, IsEnum, IsInt, Min } from "class-validator";

export enum BookingType {
  PROPERTY = "PROPERTY",
  EXPERIENCE = "EXPERIENCE",
  PACKAGE = "PACKAGE",
}

export class CreateBookingDto {
  @IsEnum(BookingType)
  type: BookingType;

  @IsInt()
  referenceId: number;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;

  @IsInt()
  @Min(1)
  guests: number;
}