import { Module } from "@nestjs/common";

import { CommonModule } from "../common/common.module";
import { PrismaModule } from "../prisma/prisma.module";
import { BlogController } from "./blog.controller";
import { BlogService } from "./blog.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [BlogController],
  providers: [BlogService],
})
export class BlogModule {}
