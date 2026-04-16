import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./infra/prisma/prisma.module";
import { OrganizationModule } from "./modules/organization/organization.module";
import { MetricsModule } from "./modules/metrics/metrics.module";

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ".env", isGlobal: true }),
    // ─────────────────────────────────────────────────────────────
    // BullModule.forRootAsync — config Redis connection สำหรับ BullMQ
    // isGlobal: true → ทุก module ใช้ Redis config นี้ได้โดยไม่ต้องตั้งค่าซ้ำ
    // ─────────────────────────────────────────────────────────────
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>("REDIS_URL") ?? "redis://localhost:6379",
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    PrismaModule,
    OrganizationModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
