import { Module } from "@nestjs/common";

import { EmailModule } from "../email/email.module";
import { MailModule } from "../mail/mail.module";
import { ReviewRequestsService } from "./review-requests.service";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";

@Module({
  imports: [MailModule, EmailModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewRequestsService],
  exports: [ReviewsService, ReviewRequestsService],
})
export class ReviewsModule {}
