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

      const saveData = this.messageRepo.create({
        content: data.content,
        sender_id: sender.id,
        receiver_id: receiver.id,
        room_id: receiver.id,
      });
      return await this.messageRepo.save(saveData);
    } catch (error) {
      this.logger.error('error when save message ', error);
    }
  }

  async setUserOffline(username: string): Promise<void> {
    await this.userRepo.update({ username }, { isOnline: false });
  }

  async getRecentMessage(id: number): Promise<Message[]> {
    const query = `SELECT r.id AS room_id , m.content, m.timestamp, m.is_read, u.username AS sender_username, u.id AS sender_id, u2.username AS receiver_username, u2.id AS receiver_id 
    FROM rooms AS r
    LEFT JOIN 
    messages AS m 
    ON r.id = m.room_id
    LEFT JOIN
    users AS u
    ON m.sender_id = u.id
    LEFT JOIN
    users AS u2
    ON m.receiver_id = u2.id
    WHERE 
    m.sender_id = ${id} OR m.receiver_id=${id}`;
    const message = await this.roomRepo.query(query);
    return message;
  }

  async getAllUser(): Promise<Users[]> {
    return this.userRepo.find({
      order: { isOnline: 'DESC', username: 'ASC' },
    });
  }
}
