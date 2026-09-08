import { HttpException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { GrievanceType } from "./models/grievanceType.model";
import { GrievanceTypeDto } from "./dto/grievanceType.dto";
import { handleServiceError } from "src/utils/Error/errorHandler";
import { Op } from "sequelize";
import { verifyAdmin } from "../../auth/verifyRoles";
import { AuditLogService } from "../auditLog/auditLog.service";
import { GrievanceCategory } from "../grievanceCategory/models/grievanceCategory.model";

@Injectable()
export class GrievanceTypeService {
    constructor(
        @InjectModel(GrievanceType)
        private grievanceTypeModel: typeof GrievanceType,
        private auditLogService: AuditLogService,
    ) { }

    async createGrievanceType(data: GrievanceTypeDto, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const { name, code } = data;

            if (!name || !code) {
                throw new HttpException('Name and code are required', 400);
            }

            const existingType = await this.grievanceTypeModel.findOne({
                where: { code }
            });

            if (existingType) {
                throw new HttpException('Type with this code already exists', 400);
            }

            const type = await this.grievanceTypeModel.create(data);

            try {
                await this.auditLogService.create({
                    actor_id: reqUser.id,
                    action: 'CREATE',
                    entity_type: 'Type',
                    entity_id: `TYPE-${type.id}`,
                    metadata: `Created new type "${type.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Grievance Type created successfully',
                data: type,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getAllGrievanceTypes(page?: number | string, limit?: number | string): Promise<any> {
        try {
            if (page === undefined && limit === undefined) {
                const types = await this.grievanceTypeModel.findAll({
                    include: [{
                        model: GrievanceCategory,
                        required: false,
                        attributes: ['id']
                    }],
                    order: [['name', 'ASC']]
                });

                const typesWithCount = types.map(type => {
                    const plainType = type.get({ plain: true }) as any;
                    const count = plainType.categories ? plainType.categories.length : 0;
                    delete plainType.categories;
                    return {
                        ...plainType,
                        categoriesCount: count
                    };
                });

                return {
                    success: true,
                    message: 'Grievance Types fetched successfully',
                    data: typesWithCount,
                };
            }

            const pageNum = parseInt(page as string, 10) || 1;
            const limitNum = parseInt(limit as string, 10) || 10;
            const offset = (pageNum - 1) * limitNum;

            const { count, rows } = await this.grievanceTypeModel.findAndCountAll({
                include: [{
                    model: GrievanceCategory,
                    required: false,
                    attributes: ['id']
                }],
                order: [['name', 'ASC']],
                limit: limitNum,
                offset,
                distinct: true
            });

            const typesWithCount = rows.map(type => {
                const plainType = type.get({ plain: true }) as any;
                const countVal = plainType.categories ? plainType.categories.length : 0;
                delete plainType.categories;
                return {
                    ...plainType,
                    categoriesCount: countVal
                };
            });

            return {
                success: true,
                message: 'Grievance Types fetched successfully',
                data: typesWithCount,
                total: count,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(count / limitNum),
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getGrievanceTypeById(id: number): Promise<any> {
        try {
            const type = await this.grievanceTypeModel.findOne({
                where: { id, is_active: true }
            });
            if (!type) {
                throw new HttpException('Grievance Type not found or inactive', 404);
            }
            return {
                success: true,
                message: 'Grievance Type fetched successfully',
                data: type,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async updateGrievanceType(id: number, data: Partial<GrievanceTypeDto>, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            if (data.code) {
                const existingType = await this.grievanceTypeModel.findOne({
                    where: {
                        code: data.code,
                        id: { [Op.ne]: id }
                    }
                });

                if (existingType) {
                    throw new HttpException('Type with this code already exists', 400);
                }
            }

            const [affectedCount, types] = await this.grievanceTypeModel.update(data, {
                where: { id },
                returning: true,
            });

            if (affectedCount === 0) {
                throw new HttpException('Grievance Type not found', 404);
            }

            try {
                await this.auditLogService.create({
                    actor_id: reqUser.id,
                    action: 'UPDATE',
                    entity_type: 'Type',
                    entity_id: `TYPE-${id}`,
                    metadata: `Updated type "${types[0].name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Grievance Type updated successfully',
                data: types[0],
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async deleteGrievanceType(id: number, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const type = await this.grievanceTypeModel.findOne({ where: { id, is_active: true } });
            if (!type) {
                throw new HttpException('Grievance Type not found', 404);
            }
            await type.update({ is_active: false });

            try {
                await this.auditLogService.create({
                    actor_id: reqUser.id,
                    action: 'DELETE',
                    entity_type: 'Type',
                    entity_id: `TYPE-${id}`,
                    metadata: `Deactivated type "${type.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Grievance Type deactivated successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async permanentDeleteGrievanceType(id: number, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const type = await this.grievanceTypeModel.findByPk(id);
            if (!type) {
                throw new HttpException('Grievance Type not found', 404);
            }
            await type.destroy();

            try {
                await this.auditLogService.create({
                    actor_id: reqUser.id,
                    action: 'DELETE',
                    entity_type: 'Type',
                    entity_id: `TYPE-${id}`,
                    metadata: `Permanently deleted type "${type.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Grievance Type permanently deleted successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }
}
