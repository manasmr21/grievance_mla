import { ApiProperty, PartialType } from "@nestjs/swagger";

export class EmployeeDetailsDto {
    @ApiProperty({ example: 'John Doe', description: 'Name of the employee' })
    name: string;

    @ApiProperty({ example: 1, description: 'ID of the role assigned to the employee' })
    role_id: number;

    @ApiProperty({ example: 1, description: 'ID of the department', required: false })
    department_id?: number;

    @ApiProperty({ example: true, description: 'The active status of the employee details', required: false })
    is_active?: boolean;

    @ApiProperty({ example: 'john.doe@example.com', description: 'Email address of the employee', required: false })
    email?: string;

    @ApiProperty({ example: '9876543210', description: 'Mobile number of the employee', required: false })
    mobile_number?: string;

    @ApiProperty({ example: 'password123', description: 'Password of the employee account', required: false })
    password?: string;
}

export class UpdateEmployeeDetailsDto extends PartialType(EmployeeDetailsDto) { }
