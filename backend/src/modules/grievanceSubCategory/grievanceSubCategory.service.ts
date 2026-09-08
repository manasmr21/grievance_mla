import { HttpException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { GrievanceSubCategory } from "./models/grievanceSubCategory.model";
import { GrievanceSubCategoryDto } from "./dto/grievanceSubCategory.dto";
import { GrievanceCategory } from "../grievanceCategory/models/grievanceCategory.model";
import { handleServiceError } from "src/utils/Error/errorHandler";
import { Role } from "../roles/models/roles.model";
import { verifyAdmin } from "../../auth/verifyRoles";
import { Op } from "sequelize";
import { AuditLogService } from "../auditLog/auditLog.service";
import { paginate } from "../../utils/pagination";
import { buildSearchWhere } from "src/utils/search.utils";

@Injectable()
export class GrievanceSubCategoryService {
    constructor(
        @InjectModel(GrievanceSubCategory)
        private grievanceSubCategoryModel: typeof GrievanceSubCategory,
        @InjectModel(GrievanceCategory)
        private grievanceCategoryModel: typeof GrievanceCategory,
        private auditLogService: AuditLogService,
    ) { }

    async createGrievanceSubCategory(data: GrievanceSubCategoryDto, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const { name, code, category_id } = data;

            if (!name || !code || !category_id) {
                throw new HttpException('Name, code and category_id are required', 400);
            }

            const categoryExists = await this.grievanceCategoryModel.findOne({
                where: { id: category_id },
            });

            if (!categoryExists) {
                throw new HttpException('Grievance Category not found', 404);
            }

            const existingSubCategory = await this.grievanceSubCategoryModel.findOne({
                where: { code }
            });

            if (existingSubCategory) {
                throw new HttpException('Sub category with this code already exists', 400);
            }

            const subCategory = await this.grievanceSubCategoryModel.create(data);

            try {
                await this.auditLogService.create({
                    actor_id: reqUser.id,
                    action: 'CREATE',
                    entity_type: 'Category',
                    entity_id: `CAT-${subCategory.id}`,
                    metadata: `Created new sub-category "${subCategory.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Grievance Sub Category created successfully',
                data: subCategory,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getAllGrievanceSubCategories(page?: number | string, limit?: number | string): Promise<any> {
        try {
            return await paginate(
                this.grievanceSubCategoryModel,
                {
                    include: [GrievanceCategory],
                    order: [['name', 'ASC']],
                },
                page,
                limit
            );
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getGrievanceSubCategoriesByCategoryId(category_id: number, page?: number | string, limit?: number | string, search?: string): Promise<any> {
        try {
            const searchWhere = buildSearchWhere(search, ['name', 'code']);
            return await paginate(
                this.grievanceSubCategoryModel,
                {
                    where: { category_id, ...searchWhere },
                    include: [GrievanceCategory],
                    order: [['name', 'ASC']],
                },
                page,
                limit
            );
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getGrievanceSubCategoryById(id: number): Promise<any> {
        try {
            const subCategory = await this.grievanceSubCategoryModel.findOne({
                where: { id, is_active: true },
                include: [GrievanceCategory],
            });
            if (!subCategory) {
                throw new HttpException('Grievance Sub Category not found or inactive', 404);
            }
            return {
                success: true,
                message: 'Grievance Sub Category fetched successfully',
                data: subCategory,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async updateGrievanceSubCategory(id: number, data: Partial<GrievanceSubCategoryDto>, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            if (data.category_id) {
                const categoryExists = await this.grievanceCategoryModel.findByPk(data.category_id);
                if (!categoryExists) {
                    throw new HttpException('Grievance Category not found', 404);
                }
            }

            if (data.code) {
                const existingSubCategory = await this.grievanceSubCategoryModel.findOne({
                    where: {
                        code: data.code,
                        id: { [Op.ne]: id },
                    }
                });

                if (existingSubCategory) {
                    throw new HttpException('Sub category with this code already exists', 400);
                }
            }

            const [affectedCount, subCategories] = await this.grievanceSubCategoryModel.update(data, {
                where: { id },
                returning: true,
            });

            if (affectedCount === 0) {
                throw new HttpException('Grievance Sub Category not found', 404);
            }

            try {
                await this.auditLogService.create({
                    actor_id: reqUser.id,
                    action: 'UPDATE',
                    entity_type: 'Category',
                    entity_id: `CAT-${id}`,
                    metadata: `Updated sub-category "${subCategories[0].name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Grievance Sub Category updated successfully',
                data: subCategories[0],
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async deleteGrievanceSubCategory(id: number, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const subCategory = await this.grievanceSubCategoryModel.findOne({ where: { id, is_active: true } });
            if (!subCategory) {
                throw new HttpException('Grievance Sub Category not found', 404);
            }
            await subCategory.update({ is_active: false });

            try {
                await this.auditLogService.create({
                    actor_id: reqUser.id,
                    action: 'DELETE',
                    entity_type: 'Category',
                    entity_id: `CAT-${id}`,
                    metadata: `Deactivated sub-category "${subCategory.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Grievance Sub Category deactivated successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async permanentDeleteGrievanceSubCategory(id: number, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const subCategory = await this.grievanceSubCategoryModel.findByPk(id);
            if (!subCategory) {
                throw new HttpException('Grievance Sub Category not found', 404);
            }
            await subCategory.destroy();

            try {
                await this.auditLogService.create({
                    actor_id: reqUser.id,
                    action: 'DELETE',
                    entity_type: 'Category',
                    entity_id: `CAT-${id}`,
                    metadata: `Permanently deleted sub-category "${subCategory.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Grievance Sub Category permanently deleted successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }
}
