import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  content: string;

  @Column()
  room_id: number;

  @Column()
  sender_id: number;

  @Column()
  receiver_id: number;

  @Column()
  is_read: number;

  @CreateDateColumn()
  timestamp: Date;
}
