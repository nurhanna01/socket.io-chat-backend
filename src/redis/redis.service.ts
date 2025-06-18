import { Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

export class RedisService implements OnModuleInit {
  private client: Redis;
  private readonly logger = new Logger('RedisService');

  onModuleInit() {
    this.client = new Redis();
    this.logger.log('ping redis!');
    this.client.ping;
  }

  getClient(): Redis {
    return this.client;
  }

  hset(key: string, field: string | number, value: string | number) {
    return this.client.hset(key, field, value);
  }

  hgetByField(key: string, field: string) {
    return this.client.hget(key, field);
  }

  hgetAll(key: string) {
    return this.client.hgetall(key);
  }

  hdelByField(key: string, field: string) {
    return this.client.hdel(key, field);
  }
}
