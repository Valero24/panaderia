import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { ProductFeaturesModule } from "../product-features/product-features.module";
import { ExperiencesController } from "./experiences.controller";
import { ExperiencesService } from "./experiences.service";

@Module({
  imports: [PrismaModule, ProductFeaturesModule],
  controllers: [ExperiencesController],
  providers: [ExperiencesService],
})
export class ExperiencesModule {}
