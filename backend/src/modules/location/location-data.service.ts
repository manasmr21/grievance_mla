import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { locationJsonUrl } from '../../config/app.config';

export type JsonLocality = { id: string; name: string };
export type JsonWard = { id: string; name: string; localities?: JsonLocality[] };
export type JsonGramPanchayat = { id: string; name: string; villages?: JsonLocality[] };
export type JsonBlock = {
    id: string;
    name: string;
    villages?: JsonLocality[];
    gram_panchayats?: JsonGramPanchayat[];
};
export type JsonMunicipality = {
    id: string;
    name: string;
    wards?: JsonWard[];
};
export type JsonDistrict = {
    id: string;
    name: string;
    blocks?: JsonBlock[];
    municipalities?: JsonMunicipality[];
};
export type JsonState = {
    id: string;
    name: string;
    districts: JsonDistrict[];
};

export type ResolvedLocation = {
    state: { id: string; name: string };
    district: { id: string; name: string };
    area: { id: string; name: string };
    subArea: { id: string; name: string } | null;
    settlement: { id: string; name: string } | null;
};

@Injectable()
export class LocationDataService implements OnModuleInit {
    private readonly logger = new Logger(LocationDataService.name);
    private tree: JsonState[] = [];

    async onModuleInit() {
        await this.loadTree();
    }

    private normalizeTree(states: JsonState[]): JsonState[] {
        return states.map((state) => ({
            ...state,
            districts: (state.districts || []).map((district) => ({
                ...district,
                blocks: district.blocks || [],
                municipalities: district.municipalities || [],
            })),
        }));
    }

    async loadTree() {
        const response = await fetch(locationJsonUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch location JSON (${response.status}) from ${locationJsonUrl}`);
        }

        const raw = await response.text();
        const jsonStart = raw.indexOf('[');
        if (jsonStart === -1) {
            throw new Error('Invalid location JSON: array not found');
        }

        const parsed: JsonState[] = JSON.parse(raw.slice(jsonStart));
        this.tree = this.normalizeTree(parsed);
        this.logger.log(`Loaded ${this.tree.length} states from ${locationJsonUrl}`);
    }

    findState(stateId: string): JsonState | undefined {
        return this.tree.find((s) => s.id === stateId);
    }

    findDistrict(stateId: string, districtId: string): JsonDistrict | undefined {
        return this.findState(stateId)?.districts.find((d) => d.id === districtId);
    }

    resolveBlockJurisdiction(
        stateId: string,
        districtId: string,
        blockId: string,
        gramPanchayatId?: string | null,
        villageId?: string | null,
    ): ResolvedLocation | null {
        const district = this.findDistrict(stateId, districtId);
        const state = this.findState(stateId);
        if (!state || !district) return null;

        const block = district.blocks?.find((b) => b.id === blockId);
        if (!block) return null;

        let subArea: { id: string; name: string } | null = null;
        let settlement: { id: string; name: string } | null = null;

        if (gramPanchayatId) {
            const gp = block.gram_panchayats?.find((g) => g.id === gramPanchayatId);
            if (!gp) return null;
            subArea = { id: gp.id, name: gp.name };

            if (villageId) {
                const village = gp.villages?.find((v) => v.id === villageId);
                if (!village) return null;
                settlement = { id: village.id, name: village.name };
            }
        } else if (villageId) {
            const village = block.villages?.find((v) => v.id === villageId);
            if (!village) return null;
            settlement = { id: village.id, name: village.name };
        }

        return {
            state: { id: state.id, name: state.name },
            district: { id: district.id, name: district.name },
            area: { id: block.id, name: block.name },
            subArea,
            settlement,
        };
    }

    resolveMunicipalityJurisdiction(
        stateId: string,
        districtId: string,
        municipalityId: string,
        wardId?: string | null,
        localityId?: string | null,
    ): ResolvedLocation | null {
        const district = this.findDistrict(stateId, districtId);
        const state = this.findState(stateId);
        if (!state || !district) return null;

        const municipality = district.municipalities?.find((m) => m.id === municipalityId);
        if (!municipality) return null;

        let subArea: { id: string; name: string } | null = null;
        let settlement: { id: string; name: string } | null = null;

        if (wardId) {
            const ward = municipality.wards?.find((w) => w.id === wardId);
            if (!ward) return null;
            subArea = { id: ward.id, name: ward.name };

            if (localityId) {
                const locality = ward.localities?.find((l) => l.id === localityId);
                if (!locality) return null;
                settlement = { id: locality.id, name: locality.name };
            }
        } else if (localityId) {
            return null;
        }

        return {
            state: { id: state.id, name: state.name },
            district: { id: district.id, name: district.name },
            area: { id: municipality.id, name: municipality.name },
            subArea,
            settlement,
        };
    }
}
