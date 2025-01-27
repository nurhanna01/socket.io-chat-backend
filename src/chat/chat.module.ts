import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from 'src/entities/message.entity';
import { Users } from 'src/entities/users.entity';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
console.log('chat module');
@Module({
  imports: [TypeOrmModule.forFeature([Message, Users])],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
