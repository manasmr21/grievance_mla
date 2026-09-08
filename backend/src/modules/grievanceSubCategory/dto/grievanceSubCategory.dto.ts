import { ApiProperty } from "@nestjs/swagger";

export class GrievanceSubCategoryDto {
    @ApiProperty({ example: 'Water Supply', description: 'The name of the sub-category' })
    name!: string;

    @ApiProperty({ example: 'WATER', description: 'The unique code of the sub-category' })
    code!: string;

    @ApiProperty({ example: 1, description: 'The ID of the parent category' })
    category_id!: number;

    @ApiProperty({ example: true, description: 'The active status of the grievance sub-category', required: false })
    is_active?: boolean;
}
