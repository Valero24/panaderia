import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

import { PrismaModule } from "./prisma/prisma.module";
import { PropertiesModule } from "./properties/properties.module";
import { AuthModule } from "./auth/auth.module";
import { BookingsModule } from "./bookings/bookings.module";
import { PaymentsModule } from "./payments/payments.module";
import { MailModule } from "./mail/mail.module";
import { ExtrasModule } from "./extras/extras.module";
import { PropertyImagesModule } from "./property-images/property-images.module";
import { AvailabilityModule } from "./availability/availability.module";
import { CalendarModule } from "./calendar/calendar.module";
import { PreReservationsModule } from "./pre-reservations/pre-reservations.module";
import { AvailabilityEngineModule } from "./availability-engine/availability-engine.module";
import { AdminOperationsModule } from "./admin-operations/admin-operations.module";
import { CommonModule } from "./common/common.module";
import { ExperiencesModule } from "./experiences/experiences.module";
import { PackagesModule } from "./packages/packages.module";
import { ContactModule } from "./contact/contact.module";
import { UsersModule } from "./users/users.module";
import { OperationalLogsModule } from "./operational-logs/operational-logs.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { SystemSettingsModule } from "./system-settings/system-settings.module";
import { HealthModule } from "./health/health.module";
import { ProductFeaturesModule } from "./product-features/product-features.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { ExchangeRatesModule } from "./exchange-rates/exchange-rates.module";
import { CurrencyModule } from "./currency/currency.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { DestinationsModule } from "./destinations/destinations.module";
import { BlogModule } from "./blog/blog.module";
import { TranslationsModule } from "./translations/translations.module";
import { BulkImportModule } from "./bulk-import/bulk-import.module";
import { MediaModule } from "./media/media.module";
import { CrmModule } from "./crm/crm.module";
import { EmailModule } from "./email/email.module";

@Module({
  imports: [
    // 🔥 CARGA GLOBAL DEL .ENV (CRÍTICO PARA JWT)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env", // opcional pero recomendado
    }),

    // 🧱 CORE
    PrismaModule,
    CommonModule,

    // 🔐 AUTH
    AuthModule,

    // 🏠 DOMINIO
    PropertiesModule,
    BookingsModule,
    PaymentsModule,
    MailModule,
    ExtrasModule,
    PropertyImagesModule,
    AvailabilityModule,
    CalendarModule,
    PreReservationsModule,
    AvailabilityEngineModule,
    AdminOperationsModule,
    ExperiencesModule,
    PackagesModule,
    ContactModule,
    UsersModule,
    OperationalLogsModule,
    DashboardModule,
    SystemSettingsModule,
    HealthModule,
    ProductFeaturesModule,
    InvoicesModule,
    ExchangeRatesModule,
    CurrencyModule,
    ReviewsModule,
    DestinationsModule,
    BlogModule,
    TranslationsModule,
    BulkImportModule,
    MediaModule,
    CrmModule,
    EmailModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}
