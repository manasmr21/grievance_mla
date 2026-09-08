import { ApiProperty } from "@nestjs/swagger";

export class TicketPriorityDto {
    @ApiProperty({ example: 'High', description: 'The name of the priority' })
    name!: string;

    @ApiProperty({ example: 'HIGH', description: 'The unique code of the priority' })
    code!: string;

    @ApiProperty({ example: 24, description: 'Resolution time in hours (e.g., 24 for Emergency, 72 for Urgent, 168 for Routine)', required: false })
    resolution_hours?: number;

    @ApiProperty({ example: true, description: 'The active status of the ticket priority', required: false })
    is_active?: boolean;
}
