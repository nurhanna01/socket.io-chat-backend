import { InjectRepository } from '@nestjs/typeorm';
import { Message } from 'src/entities/message.entity';
import { Users } from 'src/entities/users.entity';
import { Repository } from 'typeorm';
import { MessageDto } from './dto/message.dto';
import { Logger } from '@nestjs/common';
import { Rooms } from 'src/entities/rooms.entity';
import { MessageResponse } from './dto/interface';

export class ChatService {
  private logger = new Logger('Chat Service - Logger');
  constructor(
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(Users) private userRepo: Repository<Users>,
    @InjectRepository(Rooms) private roomRepo: Repository<Rooms>,
  ) {}

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
      const existingRoom = await this.roomRepo.findOne({
        where: [
          { sender_id: sender.id, receiver_id: receiver.id },
          { sender_id: receiver.id, receiver_id: sender.id },
        ],
      });

      let saveRoom;
      if (!existingRoom) {
        saveRoom = this.roomRepo.create({
          sender_id: sender.id,
          receiver_id: receiver.id,
        });
        await this.roomRepo.save(saveRoom);
      } else {
        saveRoom = existingRoom;
      }

      const saveData = this.messageRepo.create({
        content: data.content,
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

  async getRecentMessage(id: number): Promise<MessageResponse[] | []> {
    try {
      const queryRoom = `
      SELECT id, receiver_id, sender_id FROM rooms 
      WHERE receiver_id = ? OR sender_id = ?
    `;
      const roomChat = await this.roomRepo.query(queryRoom, [id, id]);
      const messageArray = [];

      for (const data of roomChat) {
        const messages = {
          id: undefined,
          friend_id: undefined,
          list_message: undefined,
        };
        messages.id = data.id;

        const queryMessage = `
        SELECT m.content, m.timestamp, m.is_read, 
               u.username AS sender_username, u.id AS sender_id, 
               u2.username AS receiver_username, u2.id AS receiver_id 
        FROM messages AS m 
        LEFT JOIN users AS u ON m.sender_id = u.id
        LEFT JOIN users AS u2 ON m.receiver_id = u2.id
        WHERE m.room_id = ?
        ORDER BY m.timestamp ASC
        LIMIT 1
      `;
        const dataMessage = await this.messageRepo.query(queryMessage, [
          data.id,
        ]);

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
      throw error;
    }
  }

  async getMessageByUser(
    myId: number,
    friendId: number,
  ): Promise<MessageResponse[] | []> {
    try {
      const queryRoom = `
      SELECT id FROM rooms 
      WHERE (sender_id = ? AND receiver_id = ?) 
      OR (sender_id = ? AND receiver_id = ?)
    `;
      const room = await this.roomRepo.query(queryRoom, [
        myId,
        friendId,
        friendId,
        myId,
      ]);

      if (!room.length) return [];

      const queryMessage = `
      SELECT m.content, m.timestamp, m.is_read,
             u.username AS sender_username, u.id AS sender_id, 
             u2.username AS receiver_username, u2.id AS receiver_id 
      FROM messages AS m 
      LEFT JOIN users AS u ON m.sender_id = u.id
      LEFT JOIN users AS u2 ON m.receiver_id = u2.id
      WHERE m.room_id = ?
      ORDER BY m.timestamp ASC
    `;
      return await this.messageRepo.query(queryMessage, [room[0].id]);
    } catch (error) {
      this.logger.error(`error get detail message : ${error}`);
      throw error;
    }
  }

  async getAllOnlineUser(): Promise<Users[]> {
    return this.userRepo.find({
      where: { isOnline: true },
      order: { isOnline: 'DESC', username: 'ASC' },
    });
  }
}
