import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PropertyImagesController } from "./property-images.controller";
import { PropertyImagesService } from "./property-images.service";

@Module({
  imports: [PrismaModule],
  controllers: [PropertyImagesController],
  providers: [PropertyImagesService],
})
export class PropertyImagesModule {}