import { IsBoolean } from "class-validator";

export class UpdateBlogPostStatusDto {
  @IsBoolean()
  isPublished!: boolean;
}
