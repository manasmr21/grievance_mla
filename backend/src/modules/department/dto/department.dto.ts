import { ApiProperty } from "@nestjs/swagger";

export class DepartmentDto {
    @ApiProperty({ example: 'Maintenance', description: 'The name of the department' })
    name!: string;

    @ApiProperty({ example: 'MAIN', description: 'The unique code of the department' })
    code!: string;

    @ApiProperty({ example: true, description: 'The active status of the department', required: false })
    is_active?: boolean;

    @ApiProperty({
        example: { default_primary_role_role_id: '1' },
        description: 'Role column values keyed by column code',
        required: false,
    })
    custom_fields?: Record<string, string | null>;
}
