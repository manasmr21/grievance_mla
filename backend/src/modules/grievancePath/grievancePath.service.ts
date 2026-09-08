import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { GrievancePath } from './models/grievancePath.model';
import { GrievancePathNode } from './models/grievancePathNode.model';
import { GrievancePathNodeRole } from './models/grievancePathNodeRole.model';
import { CreateGrievancePathDto, GrievancePathNodeDto, UpdateGrievancePathDto } from './dto/grievancePath.dto';
import { GrievanceCategory } from '../grievanceCategory/models/grievanceCategory.model';
import { GrievanceSubCategory } from '../grievanceSubCategory/models/grievanceSubCategory.model';
import { GrievanceType } from '../grievanceType/models/grievanceType.model';
import { TicketPriority } from '../ticketPriority/models/ticketPriority.model';
import { Role } from '../roles/models/roles.model';
import { AuditLogService } from '../auditLog/auditLog.service';
import { verifyAdmin } from '../../auth/verifyRoles';
import { handleServiceError } from '../../utils/Error/errorHandler';
import { PathAssigneeResolver } from './helpers/path-assignee.resolver';
import { formatRolesLabel, MAX_NODE_ROLES, normalizeRoleIds } from './helpers/grievance-path.helpers';

@Injectable()
export class GrievancePathService {
    constructor(
        @InjectModel(GrievancePath)
        private readonly pathModel: typeof GrievancePath,
        @InjectModel(GrievancePathNode)
        private readonly nodeModel: typeof GrievancePathNode,
        @InjectModel(GrievancePathNodeRole)
        private readonly nodeRoleModel: typeof GrievancePathNodeRole,
        @InjectModel(GrievanceCategory)
        private readonly categoryModel: typeof GrievanceCategory,
        @InjectModel(GrievanceSubCategory)
        private readonly subCategoryModel: typeof GrievanceSubCategory,
        @InjectModel(GrievanceType)
        private readonly typeModel: typeof GrievanceType,
        @InjectModel(TicketPriority)
        private readonly priorityModel: typeof TicketPriority,
        @InjectModel(Role)
        private readonly roleModel: typeof Role,
        private readonly auditLogService: AuditLogService,
        private readonly pathAssigneeResolver: PathAssigneeResolver,
    ) {}

    private pathIncludes() {
        return [
            { model: GrievanceType, attributes: ['id', 'name', 'code'] },
            { model: GrievanceCategory, attributes: ['id', 'name', 'code'], required: false },
            { model: GrievanceSubCategory, attributes: ['id', 'name', 'code'], required: false },
            { model: TicketPriority, attributes: ['id', 'name', 'code'] },
            {
                model: GrievancePathNode,
                include: [{ model: GrievancePathNodeRole, include: [{ model: Role, attributes: ['id', 'name', 'code'] }] }],
                separate: true,
                order: [['sequence', 'ASC']] as any,
            },
        ];
    }

    private async validateNodes(nodes: GrievancePathNodeDto[]): Promise<void> {
        if (!Array.isArray(nodes) || nodes.length === 0) {
            throw new HttpException('At least one path node is required', 400);
        }
        const sequences = new Set<number>();
        for (const node of nodes) {
            const seq = Number(node.sequence);
            if (!Number.isInteger(seq) || seq < 0) {
                throw new HttpException('Each node must have a non-negative integer sequence', 400);
            }
            if (sequences.has(seq)) {
                throw new HttpException('Node sequences must be unique within a path', 400);
            }
            sequences.add(seq);
            const nodeLabel = node.name?.trim() || `Stage ${seq + 1}`;
            const roleIds = normalizeRoleIds(node.role_ids);
            if (roleIds.length === 0) {
                throw new HttpException(`Node "${nodeLabel}" requires at least one role`, 400);
            }
            if (roleIds.length > MAX_NODE_ROLES) {
                throw new HttpException(`Maximum ${MAX_NODE_ROLES} roles per node`, 400);
            }
            const activeRoles = await this.roleModel.findAll({ where: { id: roleIds, is_active: true } });
            if (activeRoles.length !== roleIds.length) {
                throw new HttpException('One or more node roles are invalid or inactive', 400);
            }
        }
    }

    private async validateMatchCriteria(dto: {
        type_id?: number;
        category_id?: number | null;
        sub_category_id?: number | null;
        priority_id?: number;
    }): Promise<void> {
        const typeId = Number(dto.type_id);
        if (!typeId) throw new HttpException('type_id is required', 400);
        const grievanceType = await this.typeModel.findOne({ where: { id: typeId, is_active: true } });
        if (!grievanceType) throw new HttpException('Grievance type not found or inactive', 400);

        const categoryId = dto.category_id == null || dto.category_id === ('' as any) ? null : Number(dto.category_id);
        const subCategoryId = dto.sub_category_id == null || dto.sub_category_id === ('' as any) ? null : Number(dto.sub_category_id);

        if (subCategoryId && !categoryId) {
            throw new HttpException('category_id is required when sub_category_id is set', 400);
        }
        if (categoryId) {
            const category = await this.categoryModel.findOne({ where: { id: categoryId, is_active: true } });
            if (!category) throw new HttpException('Category not found or inactive', 400);
            if (Number(category.type_id) !== typeId) {
                throw new HttpException('Category does not belong to the selected type', 400);
            }
        }
        if (subCategoryId) {
            const sub = await this.subCategoryModel.findOne({ where: { id: subCategoryId, is_active: true } });
            if (!sub) throw new HttpException('Sub-category not found or inactive', 400);
            if (Number(sub.category_id) !== categoryId) {
                throw new HttpException('Sub-category does not belong to the selected category', 400);
            }
        }
        if (dto.priority_id) {
            const priority = await this.priorityModel.findOne({ where: { id: dto.priority_id, is_active: true } });
            if (!priority) throw new HttpException('Priority not found or inactive', 400);
        }
    }

    private defaultNodeName(sequence: number, rawName?: string | null): string {
        const trimmed = rawName?.trim();
        return trimmed || `Stage ${sequence + 1}`;
    }

    private defaultPathName(rawName?: string | null): string {
        const trimmed = rawName?.trim();
        return trimmed || 'Untitled Path';
    }

    private enrichPath(path: GrievancePath) {
        const plain = path.get({ plain: true }) as any;
        plain.name = plain.name?.trim() || 'Untitled Path';
        plain.nodes = (plain.nodes || []).map((node: any) => {
            const roles = (node.nodeRoles || []).map((nr: any) => nr.role).filter(Boolean);
            const sequence = Number(node.sequence ?? 0);
            return {
                ...node,
                name: node.name?.trim() || `Stage ${sequence + 1}`,
                roles,
                roles_label: formatRolesLabel(roles),
                role_ids: roles.map((r: any) => r.id),
            };
        });
        plain.node_count = plain.nodes?.length || 0;
        return plain;
    }

    private async persistNodes(pathId: number, nodes: GrievancePathNodeDto[]): Promise<void> {
        const existingNodes = await this.nodeModel.findAll({ where: { path_id: pathId }, attributes: ['id'] });
        const existingNodeIds = existingNodes.map((n) => n.id);
        if (existingNodeIds.length) {
            await this.nodeRoleModel.destroy({ where: { node_id: existingNodeIds } });
        }
        await this.nodeModel.destroy({ where: { path_id: pathId } });

        const sorted = [...nodes].sort((a, b) => a.sequence - b.sequence);
        const maxSeq = sorted[sorted.length - 1]?.sequence ?? 0;

        for (let i = 0; i < sorted.length; i++) {
            const nodeDto = sorted[i];
            const isLast = i === sorted.length - 1;
            const node = await this.nodeModel.create({
                path_id: pathId,
                sequence: nodeDto.sequence,
                name: this.defaultNodeName(nodeDto.sequence, nodeDto.name),
                description: nodeDto.description?.trim() || null,
                is_terminal: nodeDto.is_terminal ?? isLast,
            });
            const roleIds = normalizeRoleIds(nodeDto.role_ids);
            for (let j = 0; j < roleIds.length; j++) {
                await this.nodeRoleModel.create({
                    node_id: node.id,
                    role_id: roleIds[j],
                    sort_order: j + 1,
                });
            }
        }
    }

    async findMatchingPath(categoryId: number, subCategoryId: number | null): Promise<GrievancePath | null> {
        const category = await this.categoryModel.findByPk(categoryId);
        if (!category) return null;

        const typeId = category.type_id;
        const cascade = subCategoryId
            ? [
                { type_id: typeId, category_id: categoryId, sub_category_id: subCategoryId },
                { type_id: typeId, category_id: categoryId, sub_category_id: null },
                { type_id: typeId, category_id: null, sub_category_id: null },
            ]
            : [
                { type_id: typeId, category_id: categoryId, sub_category_id: null },
                { type_id: typeId, category_id: null, sub_category_id: null },
            ];

        for (const where of cascade) {
            const path = await this.pathModel.findOne({
                where: { ...where, is_active: true },
                include: this.pathIncludes(),
            });
            if (path) return path;
        }
        return null;
    }

    async getPathWithNodes(pathId: number) {
        const path = await this.pathModel.findByPk(pathId, { include: this.pathIncludes() });
        if (!path) return null;
        return this.enrichPath(path);
    }

    async resolveAssigneesFromRoleIds(roleIds: number[]): Promise<string[]> {
        return this.pathAssigneeResolver.resolveAssigneesFromRoleIds(roleIds);
    }

    async getNodeForPath(pathId: number, sequence: number): Promise<GrievancePathNode | null> {
        return this.nodeModel.findOne({
            where: { path_id: pathId, sequence },
            include: [{ model: GrievancePathNodeRole, include: [{ model: Role }] }],
        });
    }

    async resolveAssigneesForNode(nodeId: number): Promise<string[]> {
        return this.pathAssigneeResolver.resolveAssigneesForNode(nodeId);
    }

    async ensureEmployeeForUser(reqUser: { email?: string; name?: string; role_id?: number }) {
        return this.pathAssigneeResolver.ensureEmployeeForUser(reqUser);
    }

    async createPath(dto: CreateGrievancePathDto, reqUser: any) {
        try {
            verifyAdmin(reqUser);
            await this.validateMatchCriteria(dto);
            await this.validateNodes(dto.nodes);

            const path = await this.pathModel.create({
                name: this.defaultPathName(dto.name),
                type_id: dto.type_id,
                category_id: dto.category_id ?? null,
                sub_category_id: dto.sub_category_id ?? null,
                priority_id: dto.priority_id,
                is_active: true,
            });

            await this.persistNodes(path.id, dto.nodes);

            await this.auditLogService.create({
                actor_id: reqUser?.id || 1,
                action: 'CREATE',
                entity_type: 'GrievancePath',
                entity_id: String(path.id),
                metadata: `Created grievance path "${path.name}"`,
            });

            const full = await this.pathModel.findByPk(path.id, { include: this.pathIncludes() });
            return { success: true, message: 'Grievance path created', data: this.enrichPath(full!) };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getPaths(page?: string, limit?: string, sortField?: string, sortOrder?: string) {
        try {
            const pageNum = page ? Math.max(1, parseInt(page, 10)) : null;
            const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : null;

            const orderField = sortField || 'id';
            const orderDir = String(sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            if (pageNum && limitNum) {
                const { count, rows } = await this.pathModel.findAndCountAll({
                    where: { is_active: true },
                    include: this.pathIncludes(),
                    order: [[orderField, orderDir]],
                    limit: limitNum,
                    offset: (pageNum - 1) * limitNum,
                });
                return {
                    success: true,
                    data: rows.map((r) => this.enrichPath(r)),
                    pagination: { total: count, page: pageNum, limit: limitNum },
                };
            }

            const rows = await this.pathModel.findAll({
                where: { is_active: true },
                include: this.pathIncludes(),
                order: [[orderField, orderDir]],
            });
            return { success: true, data: rows.map((r) => this.enrichPath(r)) };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async updatePath(id: number, dto: UpdateGrievancePathDto, reqUser: any) {
        try {
            verifyAdmin(reqUser);
            const path = await this.pathModel.findByPk(id);
            if (!path) throw new HttpException('Grievance path not found', 404);

            await this.validateMatchCriteria({
                type_id: dto.type_id ?? path.type_id,
                category_id: dto.category_id !== undefined ? dto.category_id : path.category_id,
                sub_category_id: dto.sub_category_id !== undefined ? dto.sub_category_id : path.sub_category_id,
                priority_id: dto.priority_id ?? path.priority_id,
            });

            if (dto.nodes) await this.validateNodes(dto.nodes);

            await path.update({
                ...(dto.name !== undefined && { name: this.defaultPathName(dto.name) }),
                ...(dto.type_id !== undefined && { type_id: dto.type_id }),
                ...(dto.category_id !== undefined && { category_id: dto.category_id }),
                ...(dto.sub_category_id !== undefined && { sub_category_id: dto.sub_category_id }),
                ...(dto.priority_id !== undefined && { priority_id: dto.priority_id }),
                ...(dto.is_active !== undefined && { is_active: dto.is_active }),
            });

            if (dto.nodes) await this.persistNodes(path.id, dto.nodes);

            const full = await this.pathModel.findByPk(path.id, { include: this.pathIncludes() });
            return { success: true, message: 'Grievance path updated', data: this.enrichPath(full!) };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async softDeletePath(id: number, reqUser: any) {
        try {
            verifyAdmin(reqUser);
            const path = await this.pathModel.findByPk(id);
            if (!path) throw new HttpException('Grievance path not found', 404);
            await path.update({ is_active: false });
            return { success: true, message: 'Grievance path deactivated' };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async deletePath(id: number, reqUser: any) {
        try {
            verifyAdmin(reqUser);
            const path = await this.pathModel.findByPk(id);
            if (!path) throw new HttpException('Grievance path not found', 404);
            await this.persistNodes(path.id, []);
            await path.destroy();
            return { success: true, message: 'Grievance path permanently deleted' };
        } catch (error) {
            return handleServiceError(error);
        }
    }
}
