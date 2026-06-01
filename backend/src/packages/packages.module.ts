import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { ProductFeaturesModule } from "../product-features/product-features.module";
import { PackagesController } from "./packages.controller";
import { PackagesService } from "./packages.service";

@Module({
  imports: [PrismaModule, ProductFeaturesModule],
  controllers: [PackagesController],
  providers: [PackagesService],
})
export class PackagesModule {}
