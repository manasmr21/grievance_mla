import { ApiProperty } from "@nestjs/swagger";

export class SendMessageDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'ID of the chat session' })
    chat_id!: string;

    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'ID of the message sender' })
    sender_id!: string;

    @ApiProperty({ example: 'Hello, how can I help you?', description: 'Content of the message' })
    message!: string;
}