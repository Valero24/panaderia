import { LeadTaskStatus } from "@prisma/client";
import { ReminderType } from "@prisma/client";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MinLength } from "class-validator";

export class CreateLeadTaskDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsEnum(LeadTaskStatus)
  status?: LeadTaskStatus;

  @IsOptional()
  @IsInt()
  assignedToId?: number;

  @IsOptional()
  @IsDateString()
  reminderAt?: string;

  @IsOptional()
  @IsEnum(ReminderType)
  reminderType?: ReminderType;
}
