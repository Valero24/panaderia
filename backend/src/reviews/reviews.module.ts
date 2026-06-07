import { Module } from "@nestjs/common";

import { MailModule } from "../mail/mail.module";
import { ReviewRequestsService } from "./review-requests.service";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";

@Module({
  imports: [MailModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewRequestsService],
  exports: [ReviewsService, ReviewRequestsService],
})
export class ReviewsModule {}
