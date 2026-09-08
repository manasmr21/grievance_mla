import { ApiProperty } from "@nestjs/swagger";

export class TicketStatusDto {
    @ApiProperty({ example: 'Open', description: 'The name of the status' })
    name!: string;

    @ApiProperty({ example: 'OPEN', description: 'The unique code of the status' })
    code!: string;

    @ApiProperty({ example: true, description: 'The active status of the ticket status', required: false })
    is_active?: boolean;
}
