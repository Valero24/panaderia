ALTER TABLE "Booking"
ADD COLUMN "reviewReminderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastReviewReminderAt" TIMESTAMP(3);

