import { Module } from "@nestjs/common";
import { PropertiesController } from "./properties.controller";
import { PropertiesService } from "./properties.service";
import { PrismaModule } from "../prisma/prisma.module";
import { ProductFeaturesModule } from "../product-features/product-features.module";

@Module({
  imports: [PrismaModule, ProductFeaturesModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
})
export class PropertiesModule {}
