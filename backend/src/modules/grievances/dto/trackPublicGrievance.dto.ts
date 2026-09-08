import { ApiProperty } from '@nestjs/swagger';

export class TrackPublicGrievanceDto {
    @ApiProperty({ example: 'GRV-123456-7890', description: 'Public ticket number' })
    ticket_no!: string;

    @ApiProperty({ example: '9876543210', description: '10-digit mobile number used during submission' })
    mobile_number!: string;
}
