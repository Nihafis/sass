import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MetricsGateway } from "./metrics.gateway";
import { PrismaModule } from "src/infra/prisma/prisma.module";
import { RedisModule } from "src/infra/redis/redis.module";
import { AlertsModule } from "src/modules/alerts/alerts.module";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AlertsModule,
    // import JwtModule เพื่อให้ MetricsGateway ใช้ JwtService verify token ได้
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MetricsGateway],
})
export class MetricsModule {}
