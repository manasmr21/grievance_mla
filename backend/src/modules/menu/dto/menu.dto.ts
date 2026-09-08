import { ApiProperty } from '@nestjs/swagger';

export class MenuItemDto {
  @ApiProperty({ example: 'admin.users' })
  code!: string;

  @ApiProperty({ example: 'Manage Users' })
  label!: string;

  @ApiProperty({ example: '/admin/users', required: false, nullable: true })
  path?: string | null;

  @ApiProperty({ example: 'fa-solid fa-users-gear', required: false })
  icon?: string;

  @ApiProperty({ example: 110, required: false, nullable: true })
  parent_id?: number | null;

  @ApiProperty({ example: 1, required: false })
  sort_order?: number;

  @ApiProperty({ example: true, required: false })
  is_active?: boolean;

  @ApiProperty({ example: [1, 2], description: 'Role IDs that can access this menu', required: false })
  role_ids?: number[];
}
