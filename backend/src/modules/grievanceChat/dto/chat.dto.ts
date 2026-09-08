import { ApiProperty } from "@nestjs/swagger";

export class CreateChatDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'ID of the grievance' })
    grievance_id!: string;

    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'ID of the first user' })
    user1_id!: string;

    @ApiProperty({ example: ['550e8400-e29b-41d4-a716-446655440002'], description: 'IDs of the employees', isArray: true })
    user2_ids!: string[];

    @ApiProperty({ example: 1, description: 'Role ID of the first user' })
    user1_role_id!: number;

    @ApiProperty({ example: [2], description: 'Role IDs of the employees', isArray: true })
    user2_role_ids!: number[];
}