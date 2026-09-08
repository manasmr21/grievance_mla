import { Op } from 'sequelize';
import { Role } from '../modules/roles/models/roles.model';

type RoleSource = {
    role_id?: number | null;
};

type RoleRecord = {
    id?: number;
    code?: string | null;
    name?: string | null;
};

export function getEmployeeRoleId(source: RoleSource): number | null {
    const roleId = Number(source.role_id);
    return Number.isNaN(roleId) || roleId <= 0 ? null : roleId;
}

/** @deprecated Use getEmployeeRoleId — kept for transitional call sites */
export function getPrimaryRoleId(source: RoleSource): number | null {
    return getEmployeeRoleId(source);
}

export function employeeHasRoleCode(
    employee: RoleSource,
    roleCode: string,
    roles: RoleRecord[],
): boolean {
    const roleId = getEmployeeRoleId(employee);
    if (!roleId) return false;
    const target = roleCode.toUpperCase();
    const role = roles.find((r) => Number(r.id) === roleId);
    return role?.code?.toUpperCase() === target;
}

export function buildEmployeeRoleWhere(
    roleId: number,
    extra: Record<string, unknown> = {},
): Record<string, unknown> {
    return {
        is_active: true,
        ...extra,
        role_id: roleId,
    };
}

export function buildEmployeeAnyRoleWhere(
    roleIds: number[],
    extra: Record<string, unknown> = {},
): Record<string, unknown> {
    const uniqueRoleIds = [...new Set(roleIds.map(Number).filter((id) => !Number.isNaN(id) && id > 0))];
    if (uniqueRoleIds.length === 0) {
        return { is_active: true, ...extra };
    }

    return {
        is_active: true,
        ...extra,
        role_id: { [Op.in]: uniqueRoleIds },
    };
}

export async function attachPrimaryRole<T extends RoleSource>(
    items: T[],
    roleModel: typeof Role,
): Promise<(T & { role?: Role })[]> {
    if (!items.length) {
        return items;
    }

    const roleIds = [
        ...new Set(
            items
                .map((item) => getEmployeeRoleId(item))
                .filter((id): id is number => id != null),
        ),
    ];

    if (roleIds.length === 0) {
        return items;
    }

    const roles = await roleModel.findAll({ where: { id: roleIds } });
    const rolesById = new Map(roles.map((role) => [Number(role.id), role]));

    return items.map((item) => {
        const roleId = getEmployeeRoleId(item);
        return {
            ...item,
            role: roleId != null ? rolesById.get(roleId) : undefined,
        };
    });
}

export async function attachPrimaryRoleToOne<T extends RoleSource>(
    item: T | null | undefined,
    roleModel: typeof Role,
): Promise<(T & { role?: Role }) | null | undefined> {
    if (!item) {
        return item;
    }
    const [enriched] = await attachPrimaryRole([item], roleModel);
    return enriched;
}
