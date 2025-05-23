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
  sender: string;
  room?: number;
}

enum SocketEvents {
  JOIN_APP = 'JOIN_APP',
  JOIN_CONFIRMED = 'JOIN_CONFIRMED',
  USERS_UPDATED = 'USERS_UPDATED',
  SEND_MESSAGE = 'SEND_MESSAGE',
  RECEIVE_MESSAGE = 'RECEIVE_MESSAGE',
  DETAIL_CHAT = 'DETAIL_CHAT',
  SUCCESS_SAVE_MESSAGE = 'SUCCESS_SAVE_MESSAGE',
}

@WebSocketGateway(4000, {
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

        const users = await this.chatService.getAllOnlineUser();
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
    @MessageBody() data: { username: string },
  ) {
    try {
      const user = await this.chatService.saveUser(data.username);
      this.activeUser.set(client.id, data.username);

      const message = await this.chatService.getRecentMessage(user.id);
      const users = await this.chatService.getAllOnlineUser();

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
      const receiver_client = this.findClientByUsername(payload.receiver);
      if (!receiver_client) {
        this.logger.error(`status ${payload.receiver} user is offline`);
        return;
      }

      const message = await this.chatService.saveMessage({
        content: payload.content,
        sender: payload.sender,
        receiver: payload.receiver,
        room: payload.room,
      });

      this.server
        .to(receiver_client)
        .emit(SocketEvents.RECEIVE_MESSAGE, message);
      this.server.to(client.id).emit(SocketEvents.SUCCESS_SAVE_MESSAGE);
    } catch (error) {
      this.logger.error('error send message :', error);
    }
  }

  @SubscribeMessage(SocketEvents.DETAIL_CHAT)
  async handleDetailChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { my_id: string; friend_id: string },
  ) {
    try {
      const chat = await this.chatService.findChat(data.my_id, data.friend_id);

      client.emit(SocketEvents.DETAIL_CHAT, {
        id: data.my_id,
        room_id: chat[0]?.room_id,
        friend_id: data.friend_id,
        list_message: chat,
      });
    } catch (error) {
      this.logger.error('error detail chat :', error);
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
