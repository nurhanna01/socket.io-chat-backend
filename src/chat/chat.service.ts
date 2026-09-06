import { InjectRepository } from '@nestjs/typeorm';
import { Message } from 'src/entities/message.entity';
import { Users } from 'src/entities/users.entity';
import { Repository } from 'typeorm';
import { MessageDto } from './dto/message.dto';
import { Logger } from '@nestjs/common';
import { Rooms } from 'src/entities/rooms.entity';

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
        this.userRepo.findOne({ where: { username: data.sender } }),
        this.userRepo.findOne({ where: { username: data.receiver } }),
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
        sender_id: sender.id,
        is_read: 0,
      });
      return await this.messageRepo.save(saveData);
    } catch (error) {
      this.logger.error('error when save message ', error);
      throw error;
    }
  }

  async setUserOffline(username: string): Promise<void> {
    await this.userRepo.update({ username }, { isOnline: false });
  }

  async getConversations(userId: number) {
    try {
      const query = `
      SELECT 
        r.id AS room_id,
        r.sender_id AS room_sender_id,
        r.receiver_id AS room_receiver_id,
        m.content,
        m.timestamp,
        m.is_read,
        m.sender_id AS message_sender_id,
        u.username AS sender_username,
        u2.username AS receiver_username
      FROM rooms AS r
      LEFT JOIN messages AS m 
        ON m.room_id = r.id 
        AND m.timestamp = (
          SELECT MAX(m2.timestamp) 
          FROM messages AS m2 
          WHERE m2.room_id = r.id
        )
      LEFT JOIN users AS u ON m.sender_id = u.id
      LEFT JOIN users AS u2 ON m.receiver_id = u2.id
      WHERE r.sender_id = ? OR r.receiver_id = ?
    `;
      const rows = await this.roomRepo.query(query, [userId, userId]);
      return rows.map(row => ({
        room_id: row.room_id,
        friend_id:
          row.room_sender_id === userId
            ? row.room_receiver_id
            : row.room_sender_id,
        friend_name:
          row.room_sender_id === userId
            ? row.receiver_username
            : row.sender_username,
        last_message: row.content
          ? {
              content: row.content,
              timestamp: row.timestamp,
              is_read: row.is_read,
              sender_id: row.message_sender_id,
              sender_username: row.sender_username,
            }
          : null,
      }));
    } catch (error) {
      this.logger.error('error when get conversations', error);
      throw error;
    }
  }

  async getMessagesByRoom(roomId: number) {
    try {
      const query = `
      SELECT m.content, m.timestamp, m.is_read, m.sender_id,
            u.username AS sender_username
      FROM messages AS m
      LEFT JOIN users AS u ON m.sender_id = u.id
      WHERE m.room_id = ?
      ORDER BY m.timestamp ASC
    `;
      return await this.messageRepo.query(query, [roomId]);
    } catch (error) {
      this.logger.error('error when get messages by room', error);
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
