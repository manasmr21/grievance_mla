import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { MenuItem } from './models/menu-item.model';
import { RoleMenuItem } from './models/role-menu-item.model';
import { Role } from '../roles/models/roles.model';
import { MenuItemDto } from './dto/menu.dto';
import { handleServiceError } from 'src/utils/Error/errorHandler';
import { verifyAdmin } from '../../auth/verifyRoles';
import { buildSearchWhere } from 'src/utils/search.utils';
import { paginate } from 'src/utils/pagination';
import {
  getRoleMenuPathPrefix,
  normalizeStoredMenuPath,
  resolveMenuPathForRole,
} from './menu-path.utils';

export const DEFAULT_MENU_ROLE_CODE = 'ADMIN';

export interface MenuTreeNode {
  code: string;
  label: string;
  path: string | null;
  icon: string;
  children?: MenuTreeNode[];
}

export interface RoleMenuResponse {
  roleCode: string;
  pathPrefix: string;
  items: MenuTreeNode[];
  allowedPaths: string[];
}

@Injectable()
export class MenuService {
  constructor(
    @InjectModel(MenuItem)
    private menuItemModel: typeof MenuItem,
    @InjectModel(RoleMenuItem)
    private roleMenuItemModel: typeof RoleMenuItem,
    @InjectModel(Role)
    private roleModel: typeof Role,
  ) {}

  private collectAncestorIds(
    itemId: number,
    menuById: Map<number, MenuItem>,
    collected = new Set<number>(),
  ): Set<number> {
    const item = menuById.get(itemId);
    if (!item || collected.has(item.id)) return collected;
    collected.add(item.id);
    if (item.parent_id != null) {
      this.collectAncestorIds(item.parent_id, menuById, collected);
    }
    return collected;
  }

  private buildTreeNodes(
    itemIds: Set<number>,
    menuById: Map<number, MenuItem>,
    sortOverrides: Map<number, number | null>,
  ): MenuTreeNode[] {
    const items = [...itemIds]
      .map((id) => menuById.get(id))
      .filter((item): item is MenuItem => !!item && item.is_active !== false)
      .sort((a, b) => {
        const orderA = sortOverrides.get(a.id) ?? a.sort_order ?? 0;
        const orderB = sortOverrides.get(b.id) ?? b.sort_order ?? 0;
        return orderA - orderB || a.id - b.id;
      });

    type InternalNode = MenuTreeNode & { id: number; parent_id: number | null; children: InternalNode[] };

    const nodeMap = new Map<number, InternalNode>(
      items.map((item) => [
        item.id,
        {
          id: item.id,
          code: item.code,
          label: item.label,
          path: item.path,
          icon: item.icon,
          parent_id: item.parent_id,
          children: [],
        },
      ]),
    );

    const roots: InternalNode[] = [];
    for (const node of nodeMap.values()) {
      if (node.parent_id != null && nodeMap.has(node.parent_id)) {
        nodeMap.get(node.parent_id)!.children.push(node);
      } else if (node.parent_id == null) {
        roots.push(node);
      }
    }

    const sortNodes = (nodes: InternalNode[]) => {
      nodes.sort((a, b) => {
        const orderA = sortOverrides.get(a.id) ?? menuById.get(a.id)?.sort_order ?? 0;
        const orderB = sortOverrides.get(b.id) ?? menuById.get(b.id)?.sort_order ?? 0;
        return orderA - orderB || a.id - b.id;
      });
      nodes.forEach((n) => {
        if (n.children.length) sortNodes(n.children);
      });
    };
    sortNodes(roots);

    return roots.map((node) => this.stripInternalFields(node));
  }

  private stripInternalFields(node: MenuTreeNode & { id?: number; parent_id?: number | null; children?: any[] }): MenuTreeNode {
    const { id, parent_id, children, ...rest } = node as any;
    return {
      ...rest,
      ...(children?.length ? { children: children.map((c) => this.stripInternalFields(c)) } : {}),
    };
  }

  private flattenPaths(nodes: MenuTreeNode[], paths: string[] = []): string[] {
    for (const node of nodes) {
      if (node.path) paths.push(node.path);
      if (node.children?.length) this.flattenPaths(node.children, paths);
    }
    return paths;
  }

  private applyPathPrefixToTree(items: MenuTreeNode[], roleCode: string): MenuTreeNode[] {
    return items.map((item) => ({
      ...item,
      path: item.path ? resolveMenuPathForRole(item.path, roleCode) : null,
      ...(item.children?.length
        ? { children: this.applyPathPrefixToTree(item.children, roleCode) }
        : {}),
    }));
  }

  private async resolveRoleForMenu(roleCode: string): Promise<Role> {
    const normalized = String(roleCode || '').trim().toUpperCase();
    if (!normalized) {
      throw new HttpException('roleCode is required', 400);
    }

    const role = await this.roleModel.findOne({ where: { code: normalized, is_active: true } });
    if (!role) {
      throw new HttpException(`Role "${normalized}" not found`, 404);
    }
    return role;
  }

  private async getUserRoleIds(reqUser: any): Promise<number[]> {
    const roleId = Number(reqUser?.role_id);
    if (!Number.isNaN(roleId) && roleId > 0) {
      return [roleId];
    }
    return [];
  }

  private async assertUserHasRole(reqUser: any, roleId: number): Promise<void> {
    const userRoleIds = await this.getUserRoleIds(reqUser);
    if (!userRoleIds.includes(roleId)) {
      throw new HttpException('Access denied. You do not have this role.', 403);
    }
  }

  async getMenuForRoleCode(roleCode: string, reqUser?: any): Promise<RoleMenuResponse> {
    try {
      const role = await this.resolveRoleForMenu(roleCode);

      if (reqUser) {
        await this.assertUserHasRole(reqUser, role.id);
      }

      const roleEntries = await this.roleMenuItemModel.findAll({ where: { role_id: role.id } });
      const sortOverrides = new Map<number, number | null>(
        roleEntries.map((entry) => [entry.menu_item_id, entry.sort_order ?? null]),
      );

      const allMenuItems = await this.menuItemModel.findAll({
        where: { is_active: true },
      });
      const menuById = new Map(allMenuItems.map((item) => [item.id, item]));

      const itemIds = new Set<number>();
      for (const entry of roleEntries) {
        this.collectAncestorIds(entry.menu_item_id, menuById, itemIds);
      }

      const rawItems = this.buildTreeNodes(itemIds, menuById, sortOverrides);
      const pathPrefix = getRoleMenuPathPrefix(role.code);
      const items = this.applyPathPrefixToTree(rawItems, role.code);
      const allowedPaths = this.flattenPaths(items);

      return {
        roleCode: role.code,
        pathPrefix,
        items,
        allowedPaths,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async getAllMenus(
    page?: number | string,
    limit?: number | string,
    search?: string,
  ): Promise<any> {
    try {
      const searchWhere = buildSearchWhere(search, ['label', 'code', 'path']);
      const result = await paginate(
        this.menuItemModel,
        {
          where: searchWhere,
          distinct: true,
          col: 'id',
          include: [
            {
              model: RoleMenuItem,
              include: [{ model: Role, attributes: ['id', 'code', 'name'] }],
            },
          ],
          order: [['sort_order', 'ASC'], ['id', 'ASC']],
        },
        page,
        limit,
      );

      return {
        ...result,
        data: (result.data as MenuItem[]).map((item) => this.toFlatMenuResponse(item)),
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async getMenuTree(): Promise<any> {
    try {
      const items = await this.menuItemModel.findAll({
        where: { is_active: true },
        include: [
          {
            model: RoleMenuItem,
            include: [{ model: Role, attributes: ['id', 'code', 'name'] }],
          },
        ],
        order: [['sort_order', 'ASC'], ['id', 'ASC']],
      });

      const menuById = new Map(items.map((item) => [item.id, item]));
      const itemIds = new Set(items.map((i) => i.id));
      const sortOverrides = new Map<number, number | null>();

      const tree = this.buildTreeNodes(itemIds, menuById as Map<number, MenuItem>, sortOverrides);

      return {
        success: true,
        data: tree,
        flat: items.map((item) => this.toFlatMenuResponse(item)),
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  private toFlatMenuResponse(item: MenuItem) {
    const roleMenuItems = item.roleMenuItems || [];
    const roles = roleMenuItems
      .map((rmi) => rmi.role)
      .filter(Boolean)
      .map((r) => ({ id: r!.id, code: r!.code, name: r!.name }));

    return {
      id: item.id,
      code: item.code,
      label: item.label,
      path: item.path,
      icon: item.icon,
      parent_id: item.parent_id,
      sort_order: item.sort_order,
      is_active: item.is_active,
      role_ids: roles.map((r) => r.id),
      roles,
    };
  }

  private async validateParentId(parentId: number | null | undefined, selfId?: number): Promise<void> {
    if (parentId == null) return;

    if (selfId != null && parentId === selfId) {
      throw new HttpException('A menu item cannot be its own parent', 400);
    }

    const parent = await this.menuItemModel.findByPk(parentId);
    if (!parent) {
      throw new HttpException('Parent menu item not found', 404);
    }

    if (selfId != null) {
      let current: MenuItem | null = parent;
      const visited = new Set<number>();
      while (current) {
        if (current.id === selfId) {
          throw new HttpException('Parent assignment would create a cycle', 400);
        }
        if (visited.has(current.id)) break;
        visited.add(current.id);
        if (current.parent_id == null) break;
        current = await this.menuItemModel.findByPk(current.parent_id);
      }
    }
  }

  private async resolveAdminRoleId(): Promise<number> {
    const adminRole = await this.roleModel.findOne({
      where: { code: DEFAULT_MENU_ROLE_CODE, is_active: true },
    });
    if (!adminRole) {
      throw new HttpException('ADMIN role not found', 500);
    }
    return adminRole.id;
  }

  private async syncRoleAssignments(menuItemId: number, roleIds: number[] = []): Promise<void> {
    await this.roleMenuItemModel.destroy({ where: { menu_item_id: menuItemId } });

    const resolvedRoleIds = roleIds.length > 0 ? roleIds : [await this.resolveAdminRoleId()];

    const uniqueRoleIds = [...new Set(resolvedRoleIds)];
    const roles = await this.roleModel.findAll({ where: { id: uniqueRoleIds } });
    if (roles.length !== uniqueRoleIds.length) {
      throw new HttpException('One or more role IDs are invalid', 400);
    }

    await this.roleMenuItemModel.bulkCreate(
      uniqueRoleIds.map((roleId) => ({
        role_id: roleId,
        menu_item_id: menuItemId,
        sort_order: null,
      })),
    );
  }

  async createMenu(data: MenuItemDto, reqUser: any): Promise<any> {
    try {
      await verifyAdmin(reqUser);

      const { code, label, path, icon, parent_id, sort_order, is_active, role_ids } = data;

      if (!code?.trim() || !label?.trim()) {
        throw new HttpException('Menu code and label are required', 400);
      }

      const existing = await this.menuItemModel.findOne({ where: { code: code.trim() } });
      if (existing) {
        throw new HttpException('Menu code already exists', 400);
      }

      await this.validateParentId(parent_id ?? null);

      const menuItem = await this.menuItemModel.create({
        code: code.trim(),
        label: label.trim(),
        path: normalizeStoredMenuPath(path),
        icon: icon?.trim() || 'fa-solid fa-circle',
        parent_id: parent_id ?? null,
        sort_order: sort_order ?? 0,
        is_active: is_active !== false,
      });

      await this.syncRoleAssignments(menuItem.id, role_ids ?? []);

      const created = await this.menuItemModel.findByPk(menuItem.id, {
        include: [{ model: RoleMenuItem, include: [Role] }],
      });

      return {
        success: true,
        message: 'Menu item created successfully',
        data: this.toFlatMenuResponse(created!),
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async updateMenu(id: number, data: Partial<MenuItemDto>, reqUser: any): Promise<any> {
    try {
      await verifyAdmin(reqUser);

      const menuItem = await this.menuItemModel.findByPk(id);
      if (!menuItem) {
        throw new HttpException('Menu item not found', 404);
      }

      if (data.code && data.code.trim() !== menuItem.code) {
        const existing = await this.menuItemModel.findOne({
          where: { code: data.code.trim(), id: { [Op.ne]: id } },
        });
        if (existing) {
          throw new HttpException('Menu code already exists', 400);
        }
      }

      const nextPath = data.path !== undefined ? (data.path?.trim() || null) : menuItem.path;
      const nextRoleIds = data.role_ids;

      if (nextPath && nextRoleIds !== undefined && nextRoleIds.length === 0) {
        // Empty selection defaults to ADMIN in syncRoleAssignments
      }

      if (data.parent_id !== undefined) {
        await this.validateParentId(data.parent_id ?? null, id);
      }

      await menuItem.update({
        ...(data.code !== undefined ? { code: data.code.trim() } : {}),
        ...(data.label !== undefined ? { label: data.label.trim() } : {}),
        ...(data.path !== undefined ? { path: normalizeStoredMenuPath(data.path) } : {}),
        ...(data.icon !== undefined ? { icon: data.icon?.trim() || 'fa-solid fa-circle' } : {}),
        ...(data.parent_id !== undefined ? { parent_id: data.parent_id ?? null } : {}),
        ...(data.sort_order !== undefined ? { sort_order: data.sort_order } : {}),
        ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
      });

      if (nextRoleIds !== undefined) {
        await this.syncRoleAssignments(id, nextRoleIds);
      } else if (nextPath && !nextRoleIds) {
        const existingRoles = await this.roleMenuItemModel.count({ where: { menu_item_id: id } });
        if (existingRoles === 0) {
          await this.syncRoleAssignments(id, []);
        }
      }

      const updated = await this.menuItemModel.findByPk(id, {
        include: [{ model: RoleMenuItem, include: [Role] }],
      });

      return {
        success: true,
        message: 'Menu item updated successfully',
        data: this.toFlatMenuResponse(updated!),
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async softDeleteMenu(id: number, reqUser: any): Promise<any> {
    try {
      await verifyAdmin(reqUser);

      const menuItem = await this.menuItemModel.findByPk(id);
      if (!menuItem) {
        throw new HttpException('Menu item not found', 404);
      }

      await menuItem.update({ is_active: false });

      return {
        success: true,
        message: 'Menu item deactivated successfully',
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async permanentDeleteMenu(id: number, reqUser: any): Promise<any> {
    try {
      await verifyAdmin(reqUser);

      const menuItem = await this.menuItemModel.findByPk(id);
      if (!menuItem) {
        throw new HttpException('Menu item not found', 404);
      }

      const childCount = await this.menuItemModel.count({ where: { parent_id: id } });
      if (childCount > 0) {
        throw new HttpException('Cannot delete a menu item that has child menus', 400);
      }

      await this.roleMenuItemModel.destroy({ where: { menu_item_id: id } });
      await menuItem.destroy();

      return {
        success: true,
        message: 'Menu item permanently deleted',
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }
}
