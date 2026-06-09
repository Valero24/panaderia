import { IsIn, IsOptional, IsString } from "class-validator";

export class TranslateTextDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsIn(["es"])
  sourceLocale?: string;

  @IsIn(["en", "fr", "pt", "it"])
  targetLocale: string;
}
