import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { PrismaService } from "./infra/prisma/prisma.service";
import { LoggingInterceptor } from "./common/interceptor/logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === "production"
        ? ["log", "warn", "error"]
        : ["log", "warn", "error", "debug", "verbose"],
  });

  app.enableCors({
    origin: "http://localhost:3001",
    credentials: true,
  });

  app.get(PrismaService);
  // ✅ Global interceptor — ทุก HTTP request จะถูก log อัตโนมัติ
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
