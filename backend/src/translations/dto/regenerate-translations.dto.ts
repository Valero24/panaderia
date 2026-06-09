import { IsArray, IsBoolean, IsOptional } from "class-validator";

export class RegenerateTranslationsDto {
  @IsOptional()
  @IsArray()
  fields?: string[];

  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}
