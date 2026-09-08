import { Injectable } from '@nestjs/common';
import { LocationDataService } from './location-data.service';

@Injectable()
export class LocationService {
    constructor(private readonly locationData: LocationDataService) {}

    resolveBlockJurisdiction(
        stateId: string,
        districtId: string,
        blockId: string,
        gramPanchayatId?: string | null,
        villageId?: string | null,
    ) {
        return this.locationData.resolveBlockJurisdiction(
            stateId,
            districtId,
            blockId,
            gramPanchayatId,
            villageId,
        );
    }

    resolveMunicipalityJurisdiction(
        stateId: string,
        districtId: string,
        municipalityId: string,
        wardId?: string | null,
        localityId?: string | null,
    ) {
        return this.locationData.resolveMunicipalityJurisdiction(
            stateId,
            districtId,
            municipalityId,
            wardId,
            localityId,
        );
    }

    validateStateAndDistrict(stateId: string, districtId: string) {
        const district = this.locationData.findDistrict(stateId, districtId);
        const state = this.locationData.findState(stateId);
        if (!state || !district) return null;
        return {
            state: { id: state.id, name: state.name },
            district: { id: district.id, name: district.name },
        };
    }
}
