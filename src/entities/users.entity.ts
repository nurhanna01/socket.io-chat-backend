import { Column, Entity, PrimaryGeneratedColumn,  } from 'typeorm';

@Entity('users')
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  username: string;

  @Column()
  password : string;

  @Column({ default: false })
  isOnline: boolean;
}
