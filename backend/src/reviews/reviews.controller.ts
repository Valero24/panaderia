import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  Request,
  Delete,
} from "@nestjs/common";

import { Public } from "../auth/public.decorator";
import { Roles } from "../auth/roles.decorator";
import { ListReviewsDto } from "./dto/list-reviews.dto";
import { SubmitReviewDto } from "./dto/submit-review.dto";
import { UpdateReviewFeaturedDto } from "./dto/update-review-featured.dto";
import { UpdateReviewStatusDto } from "./dto/update-review-status.dto";
import { ReviewRequestsService } from "./review-requests.service";
import { ReviewsService } from "./reviews.service";

@Controller("reviews")
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly reviewRequestsService: ReviewRequestsService
  ) {}

  @Roles("SUPERADMIN")
  @Get()
  findAll(@Query() query: ListReviewsDto) {
    return this.reviewsService.findAll(query);
  }

  @Roles("SUPERADMIN")
  @Get("stats")
  getStats(@Request() req) {
    return this.reviewsService.getStats(req.user);
  }

  @Roles("SUPERADMIN")
  @Get("admin/rankings")
  getAdminRankings(@Request() req) {
    return this.reviewsService.getAdminRankings(req.user);
  }

  @Roles("SUPERADMIN")
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @Request() req) {
    return this.reviewsService.findOne(id, req.user);
  }

  @Roles("SUPERADMIN")
  @Post("admin/bookings/:bookingId/generate-link")
  generateAdminBookingReviewLink(
    @Param("bookingId", ParseIntPipe) bookingId: number,
    @Request() req
  ) {
    return this.reviewsService.generateBookingReviewToken(bookingId, req.user);
  }

  @Roles("SUPERADMIN")
  @Post("admin/bookings/:bookingId/send-request")
  sendAdminBookingReviewRequest(
    @Param("bookingId", ParseIntPipe) bookingId: number,
    @Request() req
  ) {
    return this.reviewRequestsService.sendReviewRequest(bookingId, req.user);
  }

  @Roles("SUPERADMIN")
  @Post("admin/send-pending-requests")
  sendPendingReviewRequests(@Request() req) {
    return this.reviewRequestsService.sendPendingReviewRequests(req.user);
  }

  @Roles("SUPERADMIN")
  @Post("admin/bookings/:bookingId/send-reminder")
  sendAdminBookingReviewReminder(
    @Param("bookingId", ParseIntPipe) bookingId: number,
    @Request() req
  ) {
    return this.reviewRequestsService.sendReviewReminder(bookingId, req.user);
  }

  @Roles("SUPERADMIN")
  @Post("admin/send-pending-reminders")
  sendPendingReviewReminders(@Request() req) {
    return this.reviewRequestsService.sendPendingReviewReminders(req.user);
  }

  @Roles("SUPERADMIN")
  @Post("admin/recalculate-ratings")
  recalculateRatings(@Request() req) {
    return this.reviewsService.recalculateAllTargetRatings(req.user);
  }

  @Roles("SUPERADMIN")
  @Post("bookings/:bookingId/request")
  generateBookingReviewToken(
    @Param("bookingId", ParseIntPipe) bookingId: number,
    @Request() req
  ) {
    return this.reviewsService.generateBookingReviewToken(bookingId, req.user);
  }

  @Public()
  @Get("by-token/:token")
  validateTokenStatus(@Param("token") token: string, @Request() req) {
    return this.reviewsService.validateTokenStatus(token, {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Public()
  @Post("by-token/:token")
  submitReviewByToken(
    @Param("token") token: string,
    @Body() dto: SubmitReviewDto,
    @Request() req
  ) {
    return this.reviewsService.submitReview(token, dto, {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Public()
  @Get("public/:targetType/:targetId/summary")
  getPublicSummary(
    @Param("targetType") targetType: string,
    @Param("targetId", ParseIntPipe) targetId: number
  ) {
    return this.reviewsService.getPublicSummary(targetType, targetId);
  }

  @Public()
  @Get("public/:targetType/:targetId")
  getPublicReviews(
    @Param("targetType") targetType: string,
    @Param("targetId", ParseIntPipe) targetId: number
  ) {
    return this.reviewsService.getPublicReviews(targetType, targetId);
  }

  @Public()
  @Get("public/:token")
  validateToken(@Param("token") token: string) {
    return this.reviewsService.validateToken(token);
  }

  @Public()
  @Post("public/:token")
  submitReview(
    @Param("token") token: string,
    @Body() dto: SubmitReviewDto,
    @Request() req
  ) {
    return this.reviewsService.submitReview(token, dto, {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Roles("SUPERADMIN")
  @Patch(":id/status")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateReviewStatusDto,
    @Request() req
  ) {
    return this.reviewsService.updateStatus(id, dto, req.user);
  }

  @Roles("SUPERADMIN")
  @Patch(":id/featured")
  updateFeatured(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateReviewFeaturedDto,
    @Request() req
  ) {
    const featured = dto.isFeatured ?? dto.featured;
    if (typeof featured !== "boolean") {
      throw new BadRequestException("Debe enviar isFeatured o featured");
    }
    return this.reviewsService.updateFeatured(id, featured, req.user);
  }

  @Roles("SUPERADMIN")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @Request() req) {
    return this.reviewsService.remove(id, req.user);
  }
}
