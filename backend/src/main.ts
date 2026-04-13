import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { PrismaService } from "./infra/prisma/prisma.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: "http://localhost:3001",
    credentials: true,
  });
  const prismaService = app.get(PrismaService);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
