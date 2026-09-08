import { ApiProperty } from '@nestjs/swagger';

export class UpdateColumnDto {
  @ApiProperty({ example: 'Building Name' })
  name!: string;
}
