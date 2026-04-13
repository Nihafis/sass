import KeyvRedis, { Keyv } from '@keyv/redis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Module({
  imports: [ConfigModule],
  providers: [
    RedisService,
    {
      provide: Keyv,
      useFactory: (config: ConfigService) => new KeyvRedis(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379'),
      inject: [ConfigService],
    },
  ],
  exports: [Keyv, RedisService],
})
export class RedisModule {}