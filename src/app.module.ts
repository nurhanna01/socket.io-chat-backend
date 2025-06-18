import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/database.config';
import { ChatModule } from './chat/chat.module';
import { RedisService } from './redis/redis.service';
@Module({
  imports: [TypeOrmModule.forRoot(typeOrmConfig), ChatModule],
  controllers: [AppController],
  providers: [AppService, RedisService],
})
export class AppModule {}
