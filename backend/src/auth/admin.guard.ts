import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { Role } from '../modules/roles/models/roles.model';

@Injectable()
export class AdminGuard extends PassportAuthGuard('jwt') implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isValid = await super.canActivate(context);
        if (!isValid) return false;

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        const ids: number[] = [];
        const roleId = Number(user?.role_id);
        if (!Number.isNaN(roleId) && roleId > 0) {
            ids.push(roleId);
        } else if (Array.isArray(user?.role_ids) && user.role_ids.length > 0) {
            ids.push(...user.role_ids);
        }

        if (ids.length === 0) {
            throw new HttpException('Access denied. No role assigned.', HttpStatus.FORBIDDEN);
        }

        const roles = await Role.findAll({ where: { id: ids } });
        if (!roles || roles.length === 0) {
            throw new HttpException('Access denied. Role not found.', HttpStatus.FORBIDDEN);
        }

        const isAdmin = roles.some(
            r => r.code === 'ADMIN' || (r.name && r.name.toUpperCase().includes('ADMIN'))
        );
        if (!isAdmin) {
            throw new HttpException('Access denied. Admin role required.', HttpStatus.FORBIDDEN);
        }

        return true;
    }
}
