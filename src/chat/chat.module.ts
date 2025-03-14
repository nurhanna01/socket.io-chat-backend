import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from 'src/entities/message.entity';
import { Users } from 'src/entities/users.entity';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Rooms } from 'src/entities/rooms.entity';
console.log('chat module');
@Module({
  imports: [TypeOrmModule.forFeature([Message, Users, Rooms])],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
