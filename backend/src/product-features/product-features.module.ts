import { Module } from "@nestjs/common";

import { ProductFeaturesController } from "./product-features.controller";
import { ProductFeaturesService } from "./product-features.service";

@Module({
  controllers: [ProductFeaturesController],
  providers: [ProductFeaturesService],
  exports: [ProductFeaturesService],
})
export class ProductFeaturesModule {}
