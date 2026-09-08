import { HttpException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { GrievanceCategory } from "./models/grievanceCategory.model";
import { GrievanceCategoryDto } from "./dto/grievanceCategory.dto";
import { handleServiceError } from "src/utils/Error/errorHandler";
import { Op } from "sequelize";
import { verifyAdmin } from "../../auth/verifyRoles";
import { GrievanceSubCategory } from "../grievanceSubCategory/models/grievanceSubCategory.model";
import { GrievanceType } from "../grievanceType/models/grievanceType.model";
import { AuditLogService } from "../auditLog/auditLog.service";
import { paginate } from "../../utils/pagination";
import { buildSearchWhere } from "src/utils/search.utils";

@Injectable()
export class GrievanceCategoryService {
    constructor(
        @InjectModel(GrievanceCategory)
        private grievanceCategoryModel: typeof GrievanceCategory,
        private auditLogService: AuditLogService,
    ) { }

    async createGrievanceCategory(data: GrievanceCategoryDto, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const { name, code } = data;

            if (!name || !code) {
                throw new HttpException('Name and code are required', 400);
            }

            const existingCategory = await this.grievanceCategoryModel.findOne({
                where: { code }
            });

            if (existingCategory) {
                throw new HttpException('Category with this code already exists', 400);
            }

            const category = await this.grievanceCategoryModel.create(data);

            try {
                await this.auditLogService.create({
                    actor_id: reqUser.id,
                    action: 'CREATE',
                    entity_type: 'Category',
                    entity_id: `CAT-${category.id}`,
                    metadata: `Created new category "${category.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Grievance Category created successfully',
                data: category,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getAllGrievanceCategories(reqUser?: any, page?: number | string, limit?: number | string, search?: string): Promise<any> {
        try {
            const searchWhere = buildSearchWhere(search, ['name', 'code']);
            const whereCondition: any = { ...searchWhere };

            if (page === undefined && limit === undefined) {
                const categories = await this.grievanceCategoryModel.findAll({
                    where: whereCondition,
                    include: [
                        {
                            model: GrievanceSubCategory,

                            required: false,
                            attributes: ['id']
                        },
                        {
                            model: GrievanceType,
                            required: false
                        }
                    ],
                    order: [['name', 'ASC']]
                });

                const categoriesWithCount = categories.map(cat => {
                    const plainCat = cat.get({ plain: true }) as any;
                    const count = plainCat.subCategories ? plainCat.subCategories.length : 0;
                    delete plainCat.subCategories;
                    return {
                        ...plainCat,
                        subCategoriesCount: count
                    };
                });

                return {
                    success: true,
                    message: 'Grievance Categories fetched successfully',
                    data: categoriesWithCount,
                };
            }

            const pageNum = parseInt(page as string, 10) || 1;
            const limitNum = parseInt(limit as string, 10) || 10;
            const offset = (pageNum - 1) * limitNum;

            const { count, rows } = await this.grievanceCategoryModel.findAndCountAll({
                where: whereCondition,
                include: [
                    {
                        model: GrievanceSubCategory,

                        required: false,
                        attributes: ['id']
                    },
                    {
                        model: GrievanceType,
                        required: false
                    }
                ],
                order: [['name', 'ASC']],
                limit: limitNum,
                offset,
                distinct: true
            });

            const categoriesWithCount = rows.map(cat => {
                const plainCat = cat.get({ plain: true }) as any;
                const count = plainCat.subCategories ? plainCat.subCategories.length : 0;
                delete plainCat.subCategories;
                return {
                    ...plainCat,
                    subCategoriesCount: count
                };
            });

            return {
                success: true,
                message: 'Grievance Categories fetched successfully',
                data: categoriesWithCount,
                total: count,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(count / limitNum),
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getGrievanceCategoryById(id: number): Promise<any> {
        try {
            const category = await this.grievanceCategoryModel.findOne({
                where: { id, is_active: true },
                include: [{
                    model: GrievanceType,
                    required: false
                }]
            });
            if (!category) {
                throw new HttpException('Grievance Category not found or inactive', 404);
            }
            return {
                success: true,
                message: 'Grievance Category fetched successfully',
                data: category,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async updateGrievanceCategory(id: number, data: Partial<GrievanceCategoryDto>, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            if (data.code) {
                const existingCategory = await this.grievanceCategoryModel.findOne({
                    where: {
                        code: data.code,
                        id: { [Op.ne]: id }
                    }
                });

                if (existingCategory) {
                    throw new HttpException('Category with this code already exists', 400);
                }
            }

            const [affectedCount, categories] = await this.grievanceCategoryModel.update(data, {
                where: { id },
                returning: true,
            });

            if (affectedCount === 0) {
                throw new HttpException('Grievance Category not found', 404);
            }

            try {
                await this.auditLogService.create({
                    actor_id: reqUser.id,
                    action: 'UPDATE',
                    entity_type: 'Category',
                    entity_id: `CAT-${id}`,
                    metadata: `Updated category "${categories[0].name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Grievance Category updated successfully',
                data: categories[0],
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async deleteGrievanceCategory(id: number, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const category = await this.grievanceCategoryModel.findOne({ where: { id, is_active: true } });
            if (!category) {
                throw new HttpException('Grievance Category not found', 404);
            }
            await category.update({ is_active: false });

            try {
                await this.auditLogService.create({
                    actor_id: reqUser.id,
                    action: 'DELETE',
                    entity_type: 'Category',
                    entity_id: `CAT-${id}`,
                    metadata: `Deactivated category "${category.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Grievance Category deactivated successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async permanentDeleteGrievanceCategory(id: number, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const category = await this.grievanceCategoryModel.findByPk(id);
            if (!category) {
                throw new HttpException('Grievance Category not found', 404);
            }
            await category.destroy();

            try {
                await this.auditLogService.create({
                    actor_id: reqUser.id,
                    action: 'DELETE',
                    entity_type: 'Category',
                    entity_id: `CAT-${id}`,
                    metadata: `Permanently deleted category "${category.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Grievance Category permanently deleted successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }
}
