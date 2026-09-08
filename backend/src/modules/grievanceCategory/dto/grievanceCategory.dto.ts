import { ApiProperty } from "@nestjs/swagger";

export class GrievanceCategoryDto {
    @ApiProperty({ example: 'Hostel Issues', description: 'The name of the category' })
    name!: string;

    @ApiProperty({ example: 'HOSTEL', description: 'The unique code of the category' })
    code!: string;

    @ApiProperty({ example: 1, description: 'The ID of the grievance type' })
    type_id!: number;

    @ApiProperty({ example: true, description: 'The active status of the grievance category', required: false })
    is_active?: boolean;
}
