import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('rooms')
export class Rooms {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sender_id: string;

  @Column()
  receiver_id: string;
}
