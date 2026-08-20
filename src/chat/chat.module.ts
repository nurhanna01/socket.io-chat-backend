import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from 'src/entities/message.entity';
import { Users } from 'src/entities/users.entity';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Rooms } from 'src/entities/rooms.entity';
import { RedisService } from 'src/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { ChatController } from './chat.controller';
console.log('chat module');
@Module({
  imports: [TypeOrmModule.forFeature([Message, Users, Rooms])],
  providers: [ChatGateway, ChatService, RedisService, JwtService],
  controllers: [ChatController],
})
export class ChatModule {}
