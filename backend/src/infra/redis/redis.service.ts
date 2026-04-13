import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  // แยก 2 connection:
  // publisher  → ใช้ PUBLISH เท่านั้น
  // subscriber → ใช้ SUBSCRIBE เท่านั้น (connection นี้จะ "ล็อก" อยู่กับ subscribe)
  publisher: Redis;
  subscriber: Redis;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.publisher = new Redis(url);
    this.subscriber = new Redis(url);
  }

  onModuleInit() {
    console.log('[Redis] Publisher & Subscriber connected');
  }

  async onModuleDestroy() {
    await this.publisher.quit();
    await this.subscriber.quit();
  }
}