import { InjectRepository } from '@nestjs/typeorm';
import { Message } from 'src/entities/message.entity';
import { Users } from 'src/entities/users.entity';
import { Repository } from 'typeorm';
import { MessageDto, MessageDtoLengkap } from './dto/message.dto';
import { Logger } from '@nestjs/common';
import { Rooms } from 'src/entities/rooms.entity';

export class ChatService {
  private logger = new Logger('Chat Service - Logger');
  constructor(
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(Users) private userRepo: Repository<Users>,
    @InjectRepository(Rooms) private roomRepo: Repository<Rooms>,
  ) {}

  async saveUser(username: string): Promise<Users> {
    try {
      this.logger.log(`find user ${username}`);
      let user = await this.userRepo.findOne({ where: { username } });

      if (!user) {
        user = this.userRepo.create({ username, isOnline: true });
        this.logger.log('create new user: ', user);
      } else {
        this.logger.log('update user: ', user);
        user.isOnline = true;
      }
      return await this.userRepo.save(user);
    } catch (error) {
      this.logger.error('error when save user ', error);
    }
  }

  async saveMessage(data: MessageDto): Promise<Message> {
    try {
      const [sender, receiver] = await Promise.all([
        this.userRepo.findOne({
          where: { username: data.sender },
        }),
        this.userRepo.findOne({
          where: { username: data.receiver },
        }),
      ]);
      const room_id = data.room;

      let saveRoom;
      if (!room_id) {
        saveRoom = this.roomRepo.create({
          sender_id: sender.id,
          receiver_id: receiver.id,
        });
        await this.roomRepo.save(saveRoom);
      }

      const saveData = this.messageRepo.create({
        content: data.content,
        sender_id: sender.id,
        receiver_id: receiver.id,
        room_id: data.room || saveRoom.id,
        is_read: 0,
      });
      return await this.messageRepo.save(saveData);
    } catch (error) {
      this.logger.error('error when save message ', error);
    }
  }

  async setUserOffline(username: string): Promise<void> {
    await this.userRepo.update({ username }, { isOnline: false });
  }

  async getRecentMessage(id: number): Promise<MessageDtoLengkap[] | []> {
    try {
      const queryRoom = `
      SELECT id, receiver_id, sender_id FROM rooms WHERE receiver_id = ${id} OR sender_id = ${id}
      `;
      const roomChat = await this.roomRepo.query(queryRoom);
      const messageArray = [];

      for (const data of roomChat) {
        const messages = {
          id: undefined,
          friend_id: undefined,
          list_message: undefined,
        };
        messages.id = data.id;
        const queryMessage = `
        SELECT m.content, m.timestamp, m.is_read, u.username AS sender_username, u.id AS sender_id, u2.username AS receiver_username, u2.id AS receiver_id 
        FROM messages AS m 
        LEFT JOIN
        users AS u
        ON m.sender_id = u.id
        LEFT JOIN
        users AS u2
        ON m.receiver_id = u2.id
        WHERE 
        m.sender_id = ${id} AND m.room_id=${data.id} OR m.receiver_id=${id} AND m.room_id=${data.id}
        LIMIT 100
        `;
        const dataMessage = await this.messageRepo.query(queryMessage);
        messages.list_message = dataMessage;
        if (!messages.friend_id) {
          messages.friend_id =
            messages.list_message[0].sender_id === id
              ? Number(messages.list_message[0].receiver_id)
              : Number(messages.list_message[0].sender_id);
        }
        messageArray.push(messages);
      }

      return messageArray;
    } catch (error) {
      this.logger.error(`error get message : ${error}`);
    }
  }

  async findChat(
    my_id: string,
    friend_id: string,
  ): Promise<MessageDtoLengkap[] | []> {
    try {
      const queryMessage = `
      SELECT m.content, m.timestamp, m.is_read, m.room_id, u.username AS sender_username, u.id AS sender_id, u2.username AS receiver_username, u2.id AS receiver_id 
      FROM messages AS m 
      LEFT JOIN
      users AS u
      ON m.sender_id = u.id
      LEFT JOIN
      users AS u2
      ON m.receiver_id = u2.id
      WHERE 
      (m.sender_id = ${my_id} AND m.receiver_id=${friend_id}) OR (m.receiver_id=${my_id} AND m.sender_id=${friend_id})
      `;
      const dataMessage = await this.messageRepo.query(queryMessage);
      return dataMessage;
    } catch (error) {
      this.logger.error(`error get detail message : ${error}`);
    }
  }

  async getAllOnlineUser(): Promise<Users[]> {
    return this.userRepo.find({
      where: { isOnline: true },
      order: { isOnline: 'DESC', username: 'ASC' },
    });
  }
}
