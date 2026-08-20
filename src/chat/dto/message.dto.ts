import { IsNotEmpty } from 'class-validator';
export class getMessageByIdDto {
  @IsNotEmpty()
  userId: number;
}

export class MessageDto {
  @IsNotEmpty()
  sender: string;

  @IsNotEmpty()
  receiver: string;
  room: number;
  content: string;
}
