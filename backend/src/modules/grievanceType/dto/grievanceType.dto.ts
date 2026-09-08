import { ApiProperty } from "@nestjs/swagger";

export class GrievanceTypeDto {
    @ApiProperty({ example: 'Hostel', description: 'The name of the type' })
    name!: string;

    @ApiProperty({ example: 'HOSTEL', description: 'The unique code of the type' })
    code!: string;

    @ApiProperty({ example: true, description: 'The active status of the type', required: false })
    is_active?: boolean;
}
