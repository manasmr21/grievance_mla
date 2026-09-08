import { ApiProperty } from '@nestjs/swagger';

export class GrievancePathNodeDto {
    @ApiProperty({ example: 0 })
    sequence!: number;

    @ApiProperty({ example: 'Submitted' })
    name!: string;

    @ApiProperty({ required: false })
    description?: string;

    @ApiProperty({ required: false, default: false })
    is_terminal?: boolean;

    @ApiProperty({ type: [Number], example: [1, 2] })
    role_ids!: number[];
}

export class CreateGrievancePathDto {
    @ApiProperty({ example: 'Road Repair Path' })
    name!: string;

    @ApiProperty({ example: 1 })
    type_id!: number;

    @ApiProperty({ required: false, nullable: true })
    category_id?: number | null;

    @ApiProperty({ required: false, nullable: true })
    sub_category_id?: number | null;

    @ApiProperty({ example: 1 })
    priority_id!: number;

    @ApiProperty({ type: [GrievancePathNodeDto] })
    nodes!: GrievancePathNodeDto[];
}

export class UpdateGrievancePathDto {
    @ApiProperty({ required: false })
    name?: string;

    @ApiProperty({ required: false })
    type_id?: number;

    @ApiProperty({ required: false, nullable: true })
    category_id?: number | null;

    @ApiProperty({ required: false, nullable: true })
    sub_category_id?: number | null;

    @ApiProperty({ required: false })
    priority_id?: number;

    @ApiProperty({ required: false })
    is_active?: boolean;

    @ApiProperty({ type: [GrievancePathNodeDto], required: false })
    nodes?: GrievancePathNodeDto[];
}
