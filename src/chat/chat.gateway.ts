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
import { RedisService } from 'src/redis/redis.service';
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
  UPDATE_LIST_MESSAGE = 'UPDATE_LIST_MESSAGE',
}

@WebSocketGateway(4000, { cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new Logger('ChatGateway - Logger');
  private key_online_user = 'online:user';
  private key_online_socket = 'online:socket';
  @WebSocketServer() server: Server;

  constructor(
    private chatService: ChatService,
    private readonly redisClient: RedisService,
  ) {
    this.logger.log('hello chat gateway');
  }

  async handleConnection(client: Socket) {
    try {
      const username = client.handshake.query.username;
      const isnullUsername = client.handshake.query.isnull;
      isnullUsername
        ? this.logger.log(`client connected: ${client.id} without username`)
        : this.logger.log(`client connected: ${client.id} with username`);
      if (!isnullUsername && username && typeof username === 'string') {
        this.logger.log(`${username} connected`);
        const user = await this.chatService.saveUser(username);
        await this.redisClient.hset(
          this.key_online_user,
          user.id,
          user.username,
        );
        await this.redisClient.hset(
          this.key_online_socket,
          `${client.id}`,
          user.id,
        );
      }
    } catch (error) {
      this.logger.error('socket error ', error);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const get_user_id = await this.redisClient.hgetByField(
        this.key_online_socket,
        `${client.id}`,
      );
      await this.redisClient.hdelByField(this.key_online_user, get_user_id);
      await this.redisClient.hdelByField(this.key_online_socket, client.id);

      const users_redis = await this.redisClient.hgetAll(this.key_online_user);
      const users = Object.entries(users_redis).map(([id, username]) => ({
        id,
        username,
      }));

      this.server.emit(SocketEvents.USERS_UPDATED, users);
      this.logger.log(`user with id ${get_user_id} disconnect!`);
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
      this.logger.log('Processing event join chat app');
      const user = await this.chatService.saveUser(data.username);
      this.logger.log(`${data.username} joined`);
      await this.redisClient.hset(this.key_online_user, user.id, user.username);
      await this.redisClient.hset(
        this.key_online_socket,
        `${client.id}`,
        user.id,
      );

      const message = await this.chatService.getRecentMessage(user.id);
      const users_redis = await this.redisClient.hgetAll(this.key_online_user);
      const users = Object.entries(users_redis).map(([id, username]) => ({
        id,
        username,
      }));

      client.emit(SocketEvents.JOIN_CONFIRMED, {
        user,
        message,
        users,
      });
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
      this.logger.log('Processing event send message');
      const receiver_client = await this.findSocketClientByUsername(
        payload.receiver,
      );
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

      this.logger.debug(
        `${payload.sender} send message to ${payload.receiver}`,
      );

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
      this.logger.log('Processing event detail message');
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

  @SubscribeMessage(SocketEvents.RECEIVE_MESSAGE)
  async handleReceiveMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { user_id: number },
  ) {
    try {
      this.logger.log('Processing event receive message');
      const message = await this.chatService.getRecentMessage(data.user_id);

      client.emit(SocketEvents.UPDATE_LIST_MESSAGE, { message });
    } catch (error) {
      this.logger.error('error detail chat :', error);
    }
  }

  async findSocketClientByUsername(username: string): Promise<string | null> {
    this.logger.log('Processing get client by username to redis');
    const all_user = await this.redisClient.hgetAll(this.key_online_user);
    let client_id: string;
    let socket_id: string;
    Object.entries(all_user).find(([key, value]) => {
      if (value === username) {
        client_id = key;
      }
    });
    const socketClient = await this.redisClient.hgetAll(this.key_online_socket);

    Object.entries(socketClient).find(([key, value]) => {
      if (value === client_id) {
        socket_id = key;
      }
    });
    return socket_id || null;
  }
}
