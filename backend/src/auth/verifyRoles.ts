import { HttpException } from "@nestjs/common";
import { Role } from "../modules/roles/models/roles.model";
import { ROLE_CODES } from "../common/constants/priority.constants";

/**
 * Resolves Role record(s) for a user from JWT payload (single role_id).
 */
const resolveRoles = async (reqUser: any): Promise<Role[]> => {
    if (!reqUser) {
        throw new HttpException('Access denied. No user found.', 403);
    }

    const ids: number[] = [];
    const roleId = Number(reqUser.role_id);
    if (!Number.isNaN(roleId) && roleId > 0) {
        ids.push(roleId);
    } else if (Array.isArray(reqUser.role_ids) && reqUser.role_ids.length > 0) {
        ids.push(...reqUser.role_ids);
    }

    if (ids.length === 0) {
        throw new HttpException('Access denied. No role assigned.', 403);
    }

    const roles = await Role.findAll({ where: { id: ids } });
    if (!roles || roles.length === 0) {
        throw new HttpException('Access denied. Role not found.', 403);
    }
    return roles;
};

export const isAdminUser = async (reqUser: any): Promise<boolean> => {
    if (!reqUser) return false;
    try {
        const roles = await resolveRoles(reqUser);
        return roles.some(
            r => r.code === ROLE_CODES.ADMIN || (r.name && r.name.toUpperCase().includes('ADMIN'))
        );
    } catch {
        return false;
    }
};

export const verifyAdmin = async (reqUser: any) => {
    const isAdmin = await isAdminUser(reqUser);
    if (!isAdmin) {
        throw new HttpException('Access denied. Admin role required.', 403);
    }
};

export const verifyStudent = async (reqUser: any) => {
    const roles = await resolveRoles(reqUser);
    const isStudent = roles.some(
        r => r.code === 'STUDENT' || (r.name && r.name.toUpperCase().includes('STUDENT'))
    );
    if (!isStudent) {
        throw new HttpException('Access denied. Student role required.', 403);
    }
};

export const verifyEmployee = async (reqUser: any) => {
    const roles = await resolveRoles(reqUser);
    const hasAdminOrStudent = roles.some(r => {
        const code = r.code ? r.code.toUpperCase() : '';
        const name = r.name ? r.name.toUpperCase() : '';
        return code === 'ADMIN' || name.includes('ADMIN') || code === 'STUDENT' || name.includes('STUDENT');
    });
    if (hasAdminOrStudent) {
        throw new HttpException('Access denied. Admin and students are not allowed.', 403);
    }
};

export const verifyWarden = async (reqUser: any) => {
    const roles = await resolveRoles(reqUser);
    const isWarden = roles.some(
        r => (r.code ? r.code.toUpperCase() : '') === 'WARDEN' ||
             (r.name ? r.name.toUpperCase() : '').includes('WARDEN')
    );
    if (!isWarden) {
        throw new HttpException('Access denied. Warden role required.', 403);
    }
};

export const verifyHod = async (reqUser: any) => {
    const roles = await resolveRoles(reqUser);
    const isHod = roles.some(
        r => (r.code ? r.code.toUpperCase() : '') === 'HOD' ||
             (r.name ? r.name.toUpperCase() : '').includes('HOD')
    );
    if (!isHod) {
        throw new HttpException('Access denied. HOD role required.', 403);
    }
};

export const verifyNotStudent = async (reqUser: any) => {
    const roles = await resolveRoles(reqUser);
    const isStudent = roles.some(
        r => (r.code ? r.code.toUpperCase() : '') === 'STUDENT' ||
             (r.name ? r.name.toUpperCase() : '').includes('STUDENT')
    );
    if (isStudent) {
        throw new HttpException('Access denied. Students are not allowed to perform this action.', 403);
    }
};
