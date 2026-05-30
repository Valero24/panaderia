ALTER TABLE "Booking"
ADD COLUMN "confirmationEmailSentAt" TIMESTAMP(3),
ADD COLUMN "confirmationWhatsappSentAt" TIMESTAMP(3),
ADD COLUMN "notificationLastError" TEXT;

