import { HttpException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import * as fs from 'fs';
import { UserAccount } from "./models/user.model";
import { Role } from "../roles/models/roles.model";
import { EmployeeDetails } from "../employeeDetails/models/employeeDetails.model";
import { LoginDto, UpdateUserAccountDto, UserDto } from "./dto/user.dto";
import bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { handleServiceError } from "src/utils/Error/errorHandler";
import type { Response } from "express";
import { MailService } from "../../utils/mail/sendMails";
import { Op } from "sequelize";
import * as crypto from "crypto";
import { AuditLogService } from "../auditLog/auditLog.service";
import { paginate } from "../../utils/pagination";
import { ROLE_CODES } from "../../common/constants/priority.constants";
import { checkRecordReferences } from "../../utils/db.utils";
import { authCookieOptions } from "../../config/app.config";

interface AuthRequest extends Request {
    user?: {
        id: string,
        name: string,
        email: string,
        role_id: number,
        account_status: string
    }
}

@Injectable()
export class UserAccountService {
    constructor(
        @InjectModel(UserAccount)
        private userAccountModel: typeof UserAccount,
        @InjectModel(Role)
        private roleModel: typeof Role,
        @InjectModel(EmployeeDetails)
        private employeeDetailsModel: typeof EmployeeDetails,
        private jwtService: JwtService,
        private mailService: MailService,
        private auditLogService: AuditLogService,
    ) { }

    async findAll(
        page?: number | string,
        limit?: number | string,
        role?: string,
        status?: string,
        search?: string,
        activeTab?: string,
        sortField?: string,
        sortOrder?: string,
    ) {
        try {
            const where: any = {};

            // 1. Role Filter
            if (role && role !== 'All Roles' && role !== 'All') {
                where.role_id = Number(role);
            }

            // 2. Status Filter
            if (status && status !== 'All Status' && status !== 'All') {
                where.account_status = status.toLowerCase();
            }

            // 3. Tab Filter
            if (activeTab && activeTab !== 'All') {
                if (activeTab === 'Inactive') {
                    where.account_status = 'inactive';
                } else {
                    where.role_id = Number(activeTab);
                }
            }

            // 4. Search Filter
            if (search) {
                const searchPattern = `%${search.trim()}%`;
                where[Op.or] = [
                    { name: { [Op.iLike]: searchPattern } },
                    { email: { [Op.iLike]: searchPattern } }
                ];
            }

            // 5. Sort
            const allowedFields = ['name', 'email', 'account_status', 'createdAt'];
            const field = (sortField && allowedFields.includes(sortField)) ? sortField : 'createdAt';
            const direction = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            return await paginate(
                this.userAccountModel,
                {
                    where,
                    attributes: { exclude: ['password'] },
                    order: [[field, direction]]
                },
                page,
                limit
            );
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async findById(id: string) {
        try {
            const user = await this.userAccountModel.findByPk(id, {
                attributes: { exclude: ['password'] }
            });
            if (!user) {
                throw new HttpException('User not found', 404);
            }
            if (user.account_status === 'inactive') {
                throw new HttpException('This user account is inactive', 403);
            }
            return {
                success: true,
                message: "User fetched successfully",
                data: user
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async register(dto: UserDto, reqUser?: any) {
        try {
            const { email, password, role_id } = dto;

            if (!role_id) {
                throw new HttpException('Role is required', 400);
            }

            const userExist = await this.userAccountModel.findOne({ where: { email } });
            if (userExist) {
                throw new HttpException('User already exists', 400);
            }
            const hashedPassword = await bcrypt.hash(password, 10);

            const role = await this.roleModel.findByPk(role_id);
            if (!role) {
                throw new HttpException('Role not found', 404);
            }

            const roleCode = role.code ? role.code.toUpperCase() : '';
            if (roleCode === ROLE_CODES.ADMIN) {
                throw new UnauthorizedException("You are not authorized to create an admin account.");
            }
            const roleName = role.name ? role.name.toUpperCase() : '';

            let dashboard_route = '/staff/dashboard';
            if (roleCode === 'ADMIN' || roleName.includes('ADMIN')) {
                dashboard_route = '/admin/dashboard';
            }

            const user = await this.userAccountModel.create({
                email,
                name: dto.name,
                password: hashedPassword,
                role_id,
                account_status: "active",
                dashboard_route
            });

            // Send credentials email
            try {
                const subject = 'Your Account Credentials - Grievance Management System';
                const message = `
                    <p>Hello <strong>${dto.name}</strong>,</p>
                    <p>Your account has been created successfully in the Grievance Management System.</p>
                    <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
                        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Your Login Credentials</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 6px 0; color: #64748b; font-weight: 500; font-size: 14px; width: 80px;">Email:</td>
                                <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-size: 14px; font-family: monospace;">${email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b; font-weight: 500; font-size: 14px;">Password:</td>
                                <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-size: 14px; font-family: monospace;">${password}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${process.env.FRONTEND_URL}/login" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Log In to Portal</a>
                    </div>
                    <p>Please log in and secure your credentials by changing your password at your earliest convenience.</p>
                `;
                await this.mailService.sendMailService(email, subject, message);
            } catch (mailError) {
                console.error('Failed to send credentials email:', mailError);
            }

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'CREATE',
                    entity_type: 'UserAccount',
                    entity_id: `USR-${user.id}`,
                    metadata: `Registered user account for "${user.email}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            const userJson = JSON.parse(JSON.stringify(user));
            delete userJson.password;

            return userJson;
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async login(dto: LoginDto, res: Response) {
        try {
            const email = dto.email?.trim();
            const password = dto.password?.trim();
            const user = await this.userAccountModel.findOne({
                where: { email },
                include: [{
                    model: Role,
                    attributes: ['id', 'code', 'name', 'is_active'],
                }],
            });
            if (!user) {
                throw new HttpException('User not found. Please register', 404);
            }

            // Incomplete registration (OTP not verified) — do not expose password errors
            if (user.account_status === 'pending') {
                throw new HttpException('User not found. Please register', 404);
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new HttpException('Invalid password', 401);
            }

            if (user.account_status !== 'active') {
                throw new HttpException(`Your account status is '${user.account_status}'. Please verify your email first.`, 401);
            }

            const payload = {
                id: user.id,
                role_id: user.role_id,
            };

            const token = this.jwtService.sign(payload);

            res.cookie('user', token, authCookieOptions());

            const { password: _password, ...userJson } = user.get({ plain: true });

            return {
                success: true,
                message: "User login successfully",
                user: userJson
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async verify(req: AuthRequest) {
        try {

            const userId = req.user?.id;

            if (!userId) {
                throw new HttpException('Unauthorized', 401);
            }
            const user = await this.userAccountModel.findOne({
                where: { id: userId },
                attributes: { exclude: ['password'] },
                include: [{
                    model: Role,
                    attributes: ['id', 'code', 'name', 'is_active'],
                }],
            });
            if (!user) {
                throw new HttpException('User not found', 404);
            }
            return {
                success: true,
                message: "Valid user",
                data: user
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async update(id: string, dto: UpdateUserAccountDto, reqUser?: any) {
        try {
            const user = await this.userAccountModel.findOne({
                where: {
                    id
                },
            });
            if (!user) {
                throw new HttpException('User not found', 404);
            }

            // If the account status is being changed to inactive, run reference checks
            if (dto.account_status === 'inactive' && user.account_status !== 'inactive') {
                const employeeRecord = await this.employeeDetailsModel.findOne({ where: { email: user.email } });

                // Tables that are auto-cleaned on deactivation/deletion — must never block
                const autoHandledTables = [
                    'grievance_execution',
                    'grievance_details',
                    'notifications',
                    'grievance_chats',
                    'grievance_messages',
                ];

                const referenceReasons = new Set<string>();

                if (employeeRecord) {
                    const empRefs = await checkRecordReferences(this.userAccountModel.sequelize!, 'employee_details', employeeRecord.id);
                    for (const ref of empRefs.filter(r => !autoHandledTables.includes(r.table))) {
                        referenceReasons.add(ref.table);
                    }
                }

                // user_account FK-based check (excluding all auto-handled / soft-reference tables)
                const userRefs = await checkRecordReferences(this.userAccountModel.sequelize!, 'user_account', id);
                for (const ref of userRefs.filter(r => !autoHandledTables.includes(r.table))) {
                    referenceReasons.add(ref.table);
                }

                if (referenceReasons.size > 0) {
                    throw new HttpException(
                        `Cannot deactivate this user. They are still associated with: ${Array.from(referenceReasons).join(', ')}. Please reassign or close those records first.`,
                        400
                    );
                }
            }



            // Allow update only for active users, unless the update itself is (re)activating the account
            if (user.account_status === 'inactive' && dto.account_status !== 'active') {
                throw new HttpException('Cannot update an inactive user account', 403);
            }

            const incomingRoleId =
                dto.role_id != null && dto.role_id !== undefined
                    ? Number(dto.role_id)
                    : undefined;

            if (incomingRoleId != null) {
                const [newRole, employeeRecord] = await Promise.all([
                    this.roleModel.findByPk(incomingRoleId),
                    this.employeeDetailsModel.findOne({ where: { email: user.email } }),
                ]);

                if (!newRole) {
                    throw new HttpException('Role not found', 404);
                }

                const newRoleCode = newRole.code?.toUpperCase() || '';
                if (newRoleCode === ROLE_CODES.ADMIN) {
                    throw new HttpException('Cannot assign Admin role through this endpoint.', 400);
                }

                const isEmployee = !!employeeRecord;

                let dashboard_route = '/staff/dashboard';
                if (newRoleCode === ROLE_CODES.ADMIN) {
                    dashboard_route = '/admin/dashboard';
                }
                (dto as any).dashboard_route = dashboard_route;

                if (isEmployee) {
                    await this.employeeDetailsModel.update(
                        { role_id: incomingRoleId },
                        { where: { email: user.email } }
                    );
                }

                (dto as any)._resolved_role_id = incomingRoleId;
            }

            if (dto.account_status) {
                const is_active = dto.account_status === 'active';
                const employeeRecord = await this.employeeDetailsModel.findOne({ where: { email: user.email } });
                if (employeeRecord) {
                    await employeeRecord.update({ is_active });

                    // When deactivating, remove this employee from all grievance assignment arrays
                    if (!is_active) {
                        try {
                            await this.userAccountModel.sequelize!.query(
                                `UPDATE grievance_details
                                 SET current_assigned_employee_id = (
                                     SELECT jsonb_agg(elem)
                                     FROM jsonb_array_elements(current_assigned_employee_id) AS elem
                                     WHERE elem::text != :employeeId
                                 )
                                 WHERE current_assigned_employee_id @> jsonb_build_array(:employeeId::jsonb)`,
                                {
                                    replacements: { employeeId: JSON.stringify(employeeRecord.id) },
                                    type: 'UPDATE' as any,
                                }
                            );
                        } catch (removeErr) {
                            console.error('Failed to remove deactivated employee from grievance assignments:', removeErr);
                        }

                        try {
                            await this.auditLogService.create({
                                actor_id: reqUser?.id || 1,
                                action: 'UPDATE',
                                entity_type: 'GrievanceAssignment',
                                entity_id: `EMP-${employeeRecord.id}`,
                                metadata: `Removed deactivated employee "${employeeRecord.name}" from all grievance assignments`
                            });
                        } catch (auditError) {
                            console.error('Failed to create audit log for grievance assignment removal:', auditError);
                        }
                    }

                    try {
                        await this.auditLogService.create({
                            actor_id: reqUser?.id || 1,
                            action: 'UPDATE',
                            entity_type: 'EmployeeDetails',
                            entity_id: `EMP-${employeeRecord.id}`,
                            metadata: `${is_active ? 'Activated' : 'Deactivated'} employee details for "${employeeRecord.name}" via user status change`
                        });
                    } catch (auditError) {
                        console.error("Failed to create audit log for employee activation/deactivation:", auditError);
                    }
                }

            }

            // Password cannot be changed through this endpoint
            if ((dto as any).password) {
                throw new HttpException('Password cannot be updated through this endpoint. Use the reset-password flow instead.', 400);
            }

            if (dto.account_status) {
                user.account_status = dto.account_status;
            }
            if (dto.name) {
                user.name = dto.name;
            }
            if (dto.email) {
                user.email = dto.email;
            }
            if ((dto as any)._resolved_role_id != null) {
                user.role_id = (dto as any)._resolved_role_id;
            }
            if ((dto as any).dashboard_route) {
                user.dashboard_route = (dto as any).dashboard_route;
            }
            await user.save();

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'UPDATE',
                    entity_type: 'UserAccount',
                    entity_id: `USR-${id}`,
                    metadata: `Updated user account details for ID ${id}`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: "User updated successfully",
                data: user
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async forgotPassword(email: string): Promise<any> {
        try {
            const user = await this.userAccountModel.findOne({ where: { email } });
            if (!user) {
                throw new HttpException('User with this email does not exist', 404);
            }

            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

            await user.update({
                reset_password_token: token,
                reset_password_expires: expires,
            });

            const frontendUrl = process.env.FRONTEND_URL;
            const resetLink = `${frontendUrl}/reset-password?token=${token}`;

            // Send password reset email
            try {
                const subject = 'Reset Your Password - Grievance Management System';
                const message = `
                    <p>Hello <strong>${user.name}</strong>,</p>
                    <p>We received a request to reset your password. Please click the button below to set a new password. This link is valid for 15 minutes:</p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${resetLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Reset Password</a>
                    </div>
                    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 24px;">
                        If the button doesn't work, copy and paste this link into your browser:
                        <br>
                        <a href="${resetLink}" style="word-break: break-all;">${resetLink}</a>
                    </p>
                    <p>If you did not request this, you can ignore this email and your password will remain unchanged.</p>
                `;
                await this.mailService.sendMailService(email, subject, message);
            } catch (mailError) {
                console.error('Failed to send reset email:', mailError);
                throw new HttpException('Failed to send password reset email', 500);
            }

            return {
                success: true,
                message: 'Password reset link sent successfully to your email',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async resetPassword(token: string, newPassword: string): Promise<any> {
        try {
            newPassword = newPassword?.trim();
            const user = await this.userAccountModel.findOne({
                where: {
                    reset_password_token: token,
                    reset_password_expires: {
                        [Op.gt]: new Date(),
                    },
                },
            });

            if (!user) {
                throw new HttpException('Invalid or expired password reset token', 400);
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await user.update({
                password: hashedPassword,
                reset_password_token: null,
                reset_password_expires: null,
            });

            return {
                success: true,
                message: 'Password reset successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async delete(id: string, reqUser?: any) {
        try {
            const user = await this.userAccountModel.findByPk(id);
            if (!user) {
                throw new HttpException('User not found', 404);
            }

            const sequelize = this.userAccountModel.sequelize!;

            const employee = await this.employeeDetailsModel.findOne({ where: { email: user.email } });

            const autoHandledTables = [
                'grievance_execution',
                'grievance_details',
                'notifications',
                'grievance_chats',
                'grievance_messages',
            ];

            const referenceReasons = new Set<string>();

            if (employee) {
                const empRefs = await checkRecordReferences(this.userAccountModel.sequelize!, 'employee_details', employee.id);
                for (const ref of empRefs.filter(r => !autoHandledTables.includes(r.table))) {
                    referenceReasons.add(ref.table);
                }
            }

            const userRefs = await checkRecordReferences(this.userAccountModel.sequelize!, 'user_account', id);
            for (const ref of userRefs.filter(r => !autoHandledTables.includes(r.table))) {
                referenceReasons.add(ref.table);
            }

            if (referenceReasons.size > 0) {
                throw new HttpException(
                    `Cannot delete this user. They are still associated with: ${Array.from(referenceReasons).join(', ')}. Please reassign or close those records first.`,
                    400
                );
            }

            // ── Pre-cleanup: remove all FK references BEFORE destroying user_account ──

            // 1. Delete grievance_messages sent by this user (FK: sender_id → user_account)
            try {
                await sequelize.query(
                    `DELETE FROM grievance_messages WHERE sender_id = :userId`,
                    { replacements: { userId: id }, type: 'DELETE' as any }
                );
            } catch (e) { console.error('Failed to delete grievance_messages for user:', e); }

            // 2. Delete grievance_chats where this user is user1 (FK: user1_id → user_account)
            try {
                await sequelize.query(
                    `DELETE FROM grievance_chats WHERE user1_id = :userId`,
                    { replacements: { userId: id }, type: 'DELETE' as any }
                );
            } catch (e) { console.error('Failed to delete grievance_chats for user:', e); }

            // 3. Delete notifications for this user (FK: user_id → user_account)
            try {
                await sequelize.query(
                    `DELETE FROM notifications WHERE user_id = :userId`,
                    { replacements: { userId: id }, type: 'DELETE' as any }
                );
            } catch (e) { console.error('Failed to delete notifications for user:', e); }

            if (employee) {
                // 4. Strip this employee from all grievance assignment JSONB arrays
                try {
                    await sequelize.query(
                        `UPDATE grievance_details
                         SET current_assigned_employee_id = (
                             SELECT jsonb_agg(elem)
                             FROM jsonb_array_elements(current_assigned_employee_id) AS elem
                             WHERE elem::text != :employeeId
                         )
                         WHERE current_assigned_employee_id @> jsonb_build_array(:employeeId::jsonb)`,
                        {
                            replacements: { employeeId: JSON.stringify(employee.id) },
                            type: 'UPDATE' as any,
                        }
                    );
                } catch (e) { console.error('Failed to remove employee from grievance assignments:', e); }

                // 5. Delete grievance_execution rows for this employee (to_id is NOT NULL)
                try {
                    await sequelize.query(
                        `DELETE FROM grievance_execution WHERE to_id = :employeeId`,
                        { replacements: { employeeId: employee.id }, type: 'DELETE' as any }
                    );
                } catch (e) { console.error('Failed to delete grievance_execution for employee:', e); }
            }

            // ── Now safe to destroy ──

            await user.destroy();
            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'DELETE',
                    entity_type: 'UserAccount',
                    entity_id: `USR-${id}`,
                    metadata: `Permanently deleted user account "${user.email}"`
                });
            } catch (auditError) { console.error("Failed to create audit log:", auditError); }

            if (employee) {
                await employee.destroy();
                try {
                    await this.auditLogService.create({
                        actor_id: reqUser?.id || 1,
                        action: 'DELETE',
                        entity_type: 'EmployeeDetails',
                        entity_id: `EMP-${employee.id}`,
                        metadata: `Permanently deleted employee details for "${employee.name}" via user deletion`
                    });
                } catch (auditError) { console.error("Failed to create audit log for employee:", auditError); }
            }

            return {
                success: true,
                message: "User deleted successfully",
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }
}