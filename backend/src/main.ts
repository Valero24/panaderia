import { ValidationPipe } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as bodyParser from "body-parser";
import { AppModule } from "./app.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { validateEnvironment } from "./common/env.validation";
import { HttpErrorFilter } from "./common/http-exception.filter";
import { rateLimitMiddleware } from "./common/rate-limit.middleware";
import { securityHeadersMiddleware } from "./common/security-headers.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  validateEnvironment();
  const port = process.env.PORT || 3000;

  app.use(
    bodyParser.json({
      limit: "1mb",
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(securityHeadersMiddleware);
  app.use(rateLimitMiddleware);

  const corsOrigin =
    process.env.CORS_ORIGIN ||
    process.env.FRONTEND_URL ||
    "http://localhost:3001";

  app.enableCors({
    origin: corsOrigin.split(",").map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  app.useGlobalFilters(new HttpErrorFilter());

  const reflector = app.get(Reflector);
  const jwtAuthGuard = app.get(JwtAuthGuard);

  app.useGlobalGuards(jwtAuthGuard, new RolesGuard(reflector));

  const config = new DocumentBuilder()
    .setTitle("Cartagena Luxury API")
    .setDescription("API para propiedades de lujo en Cartagena")
    .setVersion("1.0")
    .addTag("properties")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  await app.listen(port);

  console.log(`Backend running on http://localhost:${port}`);
  console.log(`Swagger available on http://localhost:${port}/api`);
}

bootstrap();
