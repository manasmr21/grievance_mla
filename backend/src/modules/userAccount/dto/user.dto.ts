import { ApiProperty } from "@nestjs/swagger";

export class UserDto {
    @ApiProperty({ example: 'John Doe', description: 'The name of the user' })
    name!: string;

    @ApiProperty({ example: 'user@example.com', description: 'The email of the user' })
    email!: string;

    @ApiProperty({ example: 'Password@123', description: 'The password of the user' })
    password!: string;

    @ApiProperty({ example: 1, description: 'The role id of the user' })
    role_id!: number;
}

export class LoginDto {
    @ApiProperty({ example: 'user@example.com', description: 'The email of the user' })
    email!: string;

    @ApiProperty({ example: 'Password@123', description: 'The password of the user' })
    password!: string;
}

export class UpdateUserAccountDto {
    @ApiProperty({ example: 'John Doe', description: 'The name of the user', required: false })
    name?: string;

    @ApiProperty({ example: 'user@example.com', description: 'The email of the user', required: false })
    email?: string;

    @ApiProperty({ example: 'NewPassword@123', description: 'The new password of the user', required: false })
    password?: string;

    @ApiProperty({ example: 1, description: 'The role id of the user', required: false })
    role_id?: number;

    @ApiProperty({ example: 'ACTIVE', description: 'The account status', required: false })
    account_status?: string;
}

export class ForgotPasswordDto {
    @ApiProperty({ example: 'user@example.com', description: 'The email of the user' })
    email!: string;
}

export class ResetPasswordDto {
    @ApiProperty({ example: 'PasswordToken123', description: 'The password reset token received via email' })
    token!: string;

    @ApiProperty({ example: 'NewPassword@123', description: 'The new password' })
    password!: string;
}
