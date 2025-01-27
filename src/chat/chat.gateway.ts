import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Logger } from '@nestjs/common';
console.log('chat gateway');
interface MessagePayload {
  content: string;
  receiver: string;
}

enum SocketEvents {
  JOIN_APP = 'JOIN_APP',
  JOIN_CONFIRMED = 'JOIN_CONFIRMED',
  USERS_UPDATED = 'USERS_UPDATED',
  SEND_MESSAGE = 'SEND_MESSAGE',
  RECEIVE_MESSAGE = 'RECEIVE_MESSAGE',
}

@WebSocketGateway(3001, {
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new Logger('ChatGateway - Logger');

  @WebSocketServer() server: Server;
  private activeUser: Map<string, string> = new Map();

  constructor(private chatService: ChatService) {
    this.logger.log('hello chat gateway');
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`client connected: ${client.id}`);
    } catch (error) {
      this.logger.error('socket error ', error);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const username = this.activeUser.get(client.id);
      if (username) {
        await this.chatService.setUserOffline(username);
        this.activeUser.delete(client.id);

        const users = await this.chatService.getAllUser();
        this.server.emit(SocketEvents.USERS_UPDATED, users);
        this.logger.warn(`client ${username} disconnect!`);
      }
    } catch (error) {
      this.logger.error('error diconnect', error);
    }
  }

  @SubscribeMessage(SocketEvents.JOIN_APP)
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() username: string,
  ) {
    try {
      const user = await this.chatService.saveUser(username);
      this.activeUser.set(client.id, username);

      const message = await this.chatService.getRecentMessage();
      const users = await this.chatService.getAllUser();

      client.emit(SocketEvents.JOIN_CONFIRMED, { user, message, users });
      this.server.emit(SocketEvents.USERS_UPDATED, users);
    } catch (error) {
      this.logger.error('error join :', error);
    }
  }

  @SubscribeMessage(SocketEvents.SEND_MESSAGE)
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: MessagePayload,
  ): Promise<any> {
    try {
      const username = this.activeUser.get(client.id);
      if (!username) {
        this.logger.error(`username not found`);
        return;
      }

      const receiver_client = this.findClientByUsername(payload.receiver);
      if (!receiver_client) {
        this.logger.error(`receiver not found`);
        return;
      }

      const message = await this.chatService.saveMessage({
        content: payload.content,
        sender: username,
        receiver: payload.receiver,
        room: 0,
      });

      this.server
        .to(receiver_client)
        .emit(SocketEvents.RECEIVE_MESSAGE, message);
    } catch (error) {
      this.logger.error('error send message :', error);
    }
  }

  findClientByUsername(username: string): string | null {
    for (const [key, val] of this.activeUser.entries()) {
      if (val === username) {
        return key;
      }
    }
    return null;
  }
}
