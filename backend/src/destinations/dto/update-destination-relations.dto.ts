import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from "class-validator";

class DestinationRelationItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class UpdateDestinationRelationsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DestinationRelationItemDto)
  properties?: DestinationRelationItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DestinationRelationItemDto)
  experiences?: DestinationRelationItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DestinationRelationItemDto)
  packages?: DestinationRelationItemDto[];
}
