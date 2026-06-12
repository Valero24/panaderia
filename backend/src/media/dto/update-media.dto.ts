import { MediaType } from "@prisma/client";

export class UpdateMediaDto {
  type?: MediaType;
  mediaType?: MediaType;
  url?: string;
  title?: string;
  description?: string;
  isMain?: boolean;
  isPrimary?: boolean;
  sortOrder?: number;
  thumbnailUrl?: string;
  isActive?: boolean;
  active?: boolean;
}
