import { ApiProperty } from '@nestjs/swagger';

export class PublicGrievanceDto {
    @ApiProperty({ example: 'Ramesh Kumar', maxLength: 255 })
    full_name!: string;

    @ApiProperty({ example: '9876543210', description: 'Exactly 10 digits', maxLength: 10 })
    mobile_number!: string;

    @ApiProperty({
        required: false,
        example: '123456789012',
        description: 'Optional Aadhaar number — exactly 12 digits when provided',
        maxLength: 12,
    })
    aadhaar_or_voter_id?: string;

    @ApiProperty({ example: 'Village Road, Jajpur' })
    permanent_address!: string;

    @ApiProperty({ enum: ['block', 'municipality'], example: 'block' })
    jurisdiction_type!: 'block' | 'municipality' | string;

    @ApiProperty({ example: '126', description: 'State external id from location JSON' })
    state_id!: string;

    @ApiProperty({ example: '126013', description: 'District external id from location JSON' })
    district_id!: string;

    @ApiProperty({ required: false, description: 'Block external id (when jurisdiction_type is block)' })
    block_id?: string;

    @ApiProperty({ required: false, description: 'Gram panchayat external id (block jurisdiction)' })
    gram_panchayat_id?: string;

    @ApiProperty({ required: false, description: 'Village external id (block jurisdiction)' })
    village_id?: string;

    @ApiProperty({ required: false, description: 'Municipality external id (when jurisdiction_type is municipality)' })
    municipality_id?: string;

    @ApiProperty({ required: false, description: 'Ward external id (municipality jurisdiction)' })
    ward_id?: string;

    @ApiProperty({ required: false, description: 'Locality external id (municipality jurisdiction)' })
    locality_id?: string;

    @ApiProperty({ required: false })
    location_description?: string;

    @ApiProperty({ required: false })
    gps_latitude?: string;

    @ApiProperty({ required: false })
    gps_longitude?: string;

    @ApiProperty({ enum: ['quick', 'full'], required: false, default: 'quick' })
    submission_type?: 'quick' | 'full' | string;

    @ApiProperty({ required: false, example: 1 })
    category_id?: number;

    @ApiProperty({ required: false, example: 'Broken village road', maxLength: 255 })
    subject?: string;

    @ApiProperty({ required: false })
    description?: string;

    @ApiProperty()
    declaration_accepted!: boolean | string;

    @ApiProperty({ type: 'string', format: 'binary', required: false })
    file?: Express.Multer.File;
}
