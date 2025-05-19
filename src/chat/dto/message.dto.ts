export class MessageDto {
  content: string;
  sender: string;
  receiver: string;
  room: number;
}

export class MessageDtoLengkap {
  id: number;
  room_id: number;
  list_message: [];
}
