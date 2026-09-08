import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationDataService } from './location-data.service';

@Module({
    providers: [LocationDataService, LocationService],
    exports: [LocationService, LocationDataService],
})
export class LocationModule {}
