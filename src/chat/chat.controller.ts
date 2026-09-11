import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Logger } from '@nestjs/common';
import { JwtGuard } from 'src/auth/jwt.guard';
import { getMessageByIdDto } from './dto/message.dto';

@UseGuards(JwtGuard)
@Controller('messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}
  private logger = new Logger('Chat Controller - Logger');
  @Get('/')
  async allMessage(@Request() req) {
    try {
      const id = req.user.id;
      this.logger.debug(`processing message for user with id ${id}`);
      const messages = await this.chatService.getConversations(id);
      return {
        message: 'success',
        messages,
      };
    } catch (error) {
      this.logger.error(`allMessage - error getConversations : `, error);
      throw error;
    }
  }

  @Get(':roomId')
  async messageByUser(@Request() req, @Param() dto: getMessageByIdDto) {
    try {
      const id = req.user.id;
      this.logger.debug(
        `processing message for user with id ${id} and room id ${dto.roomId}`,
      );
      const messages = await this.chatService.getMessagesByRoom(dto.roomId);
      return {
        message: 'success',
        messages,
      };
    } catch (error) {
      this.logger.error(`messageByUser - error get messages by room : `, error);
      throw error;
    }
  }
}
