import { ApiProperty, PartialType } from "@nestjs/swagger";

export class GrievanceDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'ID of the student (derived from JWT; not required from client)', required: false })
    student_id?: string;

    @ApiProperty({ example: 1, description: 'ID of the category' })
    category_id!: number;

    @ApiProperty({ example: 1, description: 'ID of the sub-category' })
    sub_category_id!: number;

    @ApiProperty({ example: 'Water Leakage', description: 'Subject of the grievance' })
    subject!: string;

    @ApiProperty({ example: 'There is a major water leakage in the bathroom.', description: 'Detailed description' })
    description!: string;

    @ApiProperty({ example: 1, description: 'Department ID', required: false })
    department?: number;

    @ApiProperty({ example: 2024, description: 'Class of (Year)', required: false })
    class_of?: number;

    @ApiProperty({ description: 'Optional image URL for the grievance', required: false })
    image_url?: string;

    @ApiProperty({ type: 'string', format: 'binary', required: false, description: 'Image file to upload' })
    file?: any;

    @ApiProperty({ example: '2026-05-01', description: 'Scholarship Application Date', required: false })
    scholarship_applied_at?: string;
}

export class UpdateGrievanceDto extends PartialType(GrievanceDto) { }

export class AssignGrievanceDto {
    @ApiProperty({ example: ['550e8400-e29b-41d4-a716-446655440001'], description: 'Array of employee IDs (max 5)', isArray: true })
    employee_ids!: string[];
}

export class ReopenGrievanceDto {
    @ApiProperty({ example: 'The issue still persists.', description: 'Remark for reopening the grievance' })
    remark!: string;
}

export class ForwardGrievanceDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Required when forwarding from terminal node — employee to assign', required: false })
    employee_id?: string;

    @ApiProperty({ example: 1, description: 'Optional department filter — validates employee role against department role columns', required: false })
    department_id?: number;
}
