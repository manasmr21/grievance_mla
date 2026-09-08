import { ApiProperty } from '@nestjs/swagger';

export class AddColumnDto {
  @ApiProperty({ example: 'Building Name' })
  name!: string;

  @ApiProperty({ example: 'BUILDING_NAME', required: false })
  code?: string;

  @ApiProperty({ example: 'text', enum: ['text', 'employee_ref', 'role_ref'] })
  field_kind!: 'text' | 'employee_ref' | 'role_ref';

  @ApiProperty({ example: 1, required: false, description: 'Required for role_ref columns' })
  role_id?: number;
}
