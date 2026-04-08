

import KeyvRedis, { Keyv } from '@keyv/redis';
import { Module } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: Keyv,
      useFactory: () => new KeyvRedis('redis://localhost:6379'),
    },
  ],
  exports: [Keyv],
})
export class RedisModule { }
