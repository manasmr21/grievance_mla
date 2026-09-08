import { HttpException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Grievance } from "./models/grievance.model";
import { GrievanceDto, UpdateGrievanceDto } from "./dto/grievance.dto";
import { PublicGrievanceDto } from "./dto/publicGrievance.dto";
import { handleServiceError } from "src/utils/Error/errorHandler";
import { GrievanceCategory } from "../grievanceCategory/models/grievanceCategory.model";
import { GrievanceSubCategory } from "../grievanceSubCategory/models/grievanceSubCategory.model";
import { TicketStatus } from "../ticketStatus/models/ticketStatus.model";
import { TicketPriority } from "../ticketPriority/models/ticketPriority.model";
import { EmployeeDetails } from "../employeeDetails/models/employeeDetails.model";
import { Role } from "../roles/models/roles.model";
import { GrievanceExecution } from "./models/grievanceExecution.model";
import { GrievanceChat } from "../grievanceChat/models/chat.model";
import { GrievanceMessages } from "../grievanceChat/models/message.model";
import { deleteGrievanceDependents } from "../../utils/grievance-cleanup.utils";
import { GrievanceType } from "../grievanceType/models/grievanceType.model";
import { CloudinaryService } from "../../utils/cloudinary/cloudinary.service";
import { MailService } from "../../utils/mail/sendMails";
import { UserAccount } from "../userAccount/models/user.model";
import { calculateSlaDueDate, formatResolutionTime } from "../../utils/sla.utils";
import { verifyAdmin, verifyNotStudent, isAdminUser } from "src/auth/verifyRoles";
import { ROLE_CODES, EXECUTION_ACTION_TYPES, SLA_HOURS } from "../../common/constants/priority.constants";
import { AuditLogService } from "../auditLog/auditLog.service";
import { getGrievanceFileUrl } from "../../config/app.config";
import { GrievancePathService } from "../grievancePath/grievancePath.service";
import { Sequelize, Op } from 'sequelize';
import { NotificationService } from "../notification/notification.service";
import { AuditLog } from "../auditLog/models/auditLog.model";
import { buildEmployeeRoleWhere, attachPrimaryRole, getPrimaryRoleId } from "../../utils/employee-role.utils";
import { LocationService } from "../location/location.service";
import { TableSchemaService } from "../tableSchema/table-schema.service";
import { Department } from "../department/models/department.model";
import { DEPARTMENT_TABLE_CODE, FIELD_KIND_ROLE_REF } from "../tableSchema/table-schema.constants";

const QUICK_GRIEVANCE_SUBJECT = 'Photo grievance report';
const QUICK_CATEGORY_CODE = 'QUICK_PHOTO';
const QUICK_CATEGORY_FALLBACK_NAMES = ['Other', 'Others', 'Miscellaneous'];

@Injectable()
export class GrievancesService {
    constructor(
        @InjectModel(Grievance)
        private grievanceModel: typeof Grievance,
        @InjectModel(GrievanceCategory)
        private categoryModel: typeof GrievanceCategory,
        @InjectModel(GrievanceSubCategory)
        private subCategoryModel: typeof GrievanceSubCategory,
        @InjectModel(TicketStatus)
        private statusModel: typeof TicketStatus,
        @InjectModel(TicketPriority)
        private priorityModel: typeof TicketPriority,
        @InjectModel(EmployeeDetails)
        private employeeModel: typeof EmployeeDetails,
        @InjectModel(GrievanceExecution)
        private grievanceExecutionModel: typeof GrievanceExecution,
        @InjectModel(GrievanceChat)
        private grievanceChatModel: typeof GrievanceChat,
        @InjectModel(GrievanceMessages)
        private grievanceMessagesModel: typeof GrievanceMessages,
        @InjectModel(UserAccount)
        private userAccountModel: typeof UserAccount,
        @InjectModel(Role)
        private readonly roleModel: typeof Role,
        @InjectModel(AuditLog)
        private auditLogModel: typeof AuditLog,
        @InjectModel(Department)
        private departmentModel: typeof Department,
        private readonly cloudinaryService: CloudinaryService,
        private readonly mailService: MailService,
        private readonly auditLogService: AuditLogService,
        private readonly notificationService: NotificationService,
        private readonly grievancePathService: GrievancePathService,
        private readonly locationService: LocationService,
        private readonly tableSchemaService: TableSchemaService,
    ) { }

    private assignedEmployeesInclude() {
        return {
            model: EmployeeDetails,
            as: 'assignedEmployees',
            on: Sequelize.literal(`"Grievance"."current_assigned_employee_id" @> jsonb_build_array("assignedEmployees"."id"::text)`),
            required: false,
        };
    }

    private async getDepartmentRoleIds(departmentId: number): Promise<number[]> {
        const columns = (await this.tableSchemaService.getActiveCustomColumns(DEPARTMENT_TABLE_CODE))
            .filter((col) => col.field_kind === FIELD_KIND_ROLE_REF);
        if (!columns.length) return [];

        const customFieldMap = await this.tableSchemaService.readCustomFieldsForDepartments([departmentId], columns);
        const fields = customFieldMap.get(departmentId) || {};
        const roleIds = new Set<number>();

        for (const col of columns) {
            const raw = fields[col.code]?.value ?? fields[col.code];
            const roleId = Number(typeof raw === 'object' && raw !== null ? (raw as any).value : raw);
            if (Number.isInteger(roleId) && roleId > 0) {
                roleIds.add(roleId);
            }
        }

        return Array.from(roleIds);
    }

    private getNodeRoleIds(currentNode: any): number[] {
        const fromRoles = (currentNode?.nodeRoles || [])
            .map((nr: any) => Number(nr.role_id ?? nr.role?.id))
            .filter((id: number) => Number.isInteger(id) && id > 0);
        return Array.from(new Set(fromRoles));
    }

    private requireNonEmptyString(value: unknown, field: string): string {
        const s = String(value ?? '').trim();
        if (!s) throw new HttpException(`${field} is required`, 400);
        return s;
    }

    private parseOptionalString(value: unknown): string | null {
        if (value === undefined || value === null || value === '') return null;
        const s = String(value).trim();
        return s || null;
    }

    private parseOptionalId(value: unknown): number | null {
        if (value === undefined || value === null || value === '') return null;
        const n = Number(value);
        return Number.isFinite(n) && n > 0 ? n : null;
    }

    private isQuickSubmission(data: PublicGrievanceDto): boolean {
        const type = String(data.submission_type || 'full').trim().toLowerCase();
        if (type === 'full') return false;
        if (type === 'quick') return true;
        return !data.category_id && !data.subject?.trim();
    }

    private async resolveQuickGrievanceCategory(): Promise<number> {
        const quickPhoto = await this.categoryModel.findOne({
            where: { code: QUICK_CATEGORY_CODE, is_active: true },
        });
        if (quickPhoto) return quickPhoto.id;

        const catchAll = await this.categoryModel.findOne({
            where: {
                is_active: true,
                name: { [Op.or]: QUICK_CATEGORY_FALLBACK_NAMES },
            },
        });
        if (catchAll) return catchAll.id;

        const fallback = await this.categoryModel.findOne({
            where: { is_active: true },
            order: [['name', 'ASC']],
        });
        if (!fallback) throw new HttpException('No active grievance category configured', 500);
        return fallback.id;
    }

    private requirePositiveId(value: unknown, field: string): number {
        const n = Number(value);
        if (!Number.isInteger(n) || n <= 0) {
            throw new HttpException(`${field} is required`, 400);
        }
        return n;
    }

    private validatePublicSubmissionFields(data: PublicGrievanceDto, isQuick: boolean) {
        const fullName = data.full_name?.trim() || '';
        if (!fullName) throw new HttpException('Full name is required', 400);
        if (fullName.length < 2) throw new HttpException('Full name must be at least 2 characters', 400);
        if (fullName.length > 255) throw new HttpException('Full name cannot exceed 255 characters', 400);

        const mobileCompact = String(data.mobile_number ?? '').replace(/\s/g, '');
        if (mobileCompact.length > 10) throw new HttpException('Mobile number cannot exceed 10 digits', 400);
        if (!/^\d{10}$/.test(mobileCompact)) throw new HttpException('Mobile number must be exactly 10 digits', 400);

        const aadhaarCompact = String(data.aadhaar_or_voter_id ?? '').replace(/\s/g, '');
        if (aadhaarCompact) {
            if (aadhaarCompact.length > 12) throw new HttpException('Aadhaar number cannot exceed 12 digits', 400);
            if (!/^\d{12}$/.test(aadhaarCompact)) throw new HttpException('Aadhaar number must be exactly 12 digits', 400);
        }

        const address = data.permanent_address?.trim() || '';
        if (!address) throw new HttpException('Permanent address is required', 400);
        if (address.length < 5) throw new HttpException('Permanent address must be at least 5 characters', 400);

        let subject: string;
        let categoryId: number | null = null;

        if (isQuick) {
            subject = QUICK_GRIEVANCE_SUBJECT;
        } else {
            subject = data.subject?.trim() || '';
            if (!subject) throw new HttpException('Subject is required', 400);
            if (subject.length < 3) throw new HttpException('Subject must be at least 3 characters', 400);
            if (subject.length > 255) throw new HttpException('Subject cannot exceed 255 characters', 400);
            categoryId = this.requirePositiveId(data.category_id, 'Category');
        }

        const jurisdictionType = String(data.jurisdiction_type || '').trim().toLowerCase();
        if (jurisdictionType !== 'block' && jurisdictionType !== 'municipality') {
            throw new HttpException('Jurisdiction type must be block or municipality', 400);
        }

        const stateId = this.requireNonEmptyString(data.state_id, 'State');
        const districtId = this.requireNonEmptyString(data.district_id, 'District');

        const declaration =
            data.declaration_accepted === true ||
            data.declaration_accepted === 'true' ||
            data.declaration_accepted === '1';
        if (!declaration) {
            throw new HttpException('Declaration must be accepted', 400);
        }

        return {
            fullName,
            mobile: mobileCompact,
            aadhaar: aadhaarCompact || null,
            address,
            subject,
            description: isQuick ? '—' : (data.description?.trim() || ''),
            locationDescription: data.location_description?.trim() || null,
            stateId,
            districtId,
            categoryId,
            jurisdictionType: jurisdictionType as 'block' | 'municipality',
            isQuick,
        };
    }

    private buildPublicSubmissionLocation(
        data: PublicGrievanceDto,
        jurisdictionType: 'block' | 'municipality',
        stateId: string,
        districtId: string,
    ) {
        if (jurisdictionType === 'block') {
            const blockId = this.requireNonEmptyString(data.block_id, 'Block');
            const gramPanchayatId = this.parseOptionalString(data.gram_panchayat_id);
            const villageId = this.parseOptionalString(data.village_id);
            const resolved = this.locationService.resolveBlockJurisdiction(
                stateId,
                districtId,
                blockId,
                gramPanchayatId,
                villageId,
            );

            return {
                state: { id: stateId, name: resolved?.state.name ?? null },
                district: { id: districtId, name: resolved?.district.name ?? null },
                area: { id: blockId, name: resolved?.area.name ?? null },
                subArea: gramPanchayatId
                    ? { id: gramPanchayatId, name: resolved?.subArea?.name ?? null }
                    : null,
                settlement: villageId
                    ? { id: villageId, name: resolved?.settlement?.name ?? null }
                    : null,
            };
        }

        const municipalityId = this.requireNonEmptyString(data.municipality_id, 'Municipality');
        const wardId = this.parseOptionalString(data.ward_id);
        const localityId = this.parseOptionalString(data.locality_id);
        const resolved = this.locationService.resolveMunicipalityJurisdiction(
            stateId,
            districtId,
            municipalityId,
            wardId,
            localityId,
        );

        return {
            state: { id: stateId, name: resolved?.state.name ?? null },
            district: { id: districtId, name: resolved?.district.name ?? null },
            area: { id: municipalityId, name: resolved?.area.name ?? null },
            subArea: wardId
                ? { id: wardId, name: resolved?.subArea?.name ?? null }
                : null,
            settlement: localityId
                ? { id: localityId, name: resolved?.settlement?.name ?? null }
                : null,
        };
    }

    private mapStatusCodeToPublicStep(code: string): string {
        const c = String(code || '').toUpperCase();
        if (c === 'ACTIVE') return 'SUBMITTED';
        if (c === 'UNDER_REVIEW') return 'UNDER_REVIEW';
        if (c === 'IN_PROGRESS') return 'IN_PROGRESS';
        if (c === 'RESOLVED' || c === 'CLOSED') return 'RESOLVED';
        if (c === 'REJECTED' || c === 'INACTIVE') return 'REJECTED';
        return 'SUBMITTED';
    }

    private buildPublicTrackTimeline(grievance: Grievance, statusCode: string) {
        const status = this.mapStatusCodeToPublicStep(statusCode);
        const submittedAt = grievance.createdAt;
        const updatedAt = grievance.updatedAt;

        const statusMeta: Record<string, { title: string; description: string }> = {
            SUBMITTED: {
                title: 'Application Submitted',
                description: 'Your grievance has been received and registered in the system.',
            },
            UNDER_REVIEW: {
                title: 'Under Review',
                description: 'Your application is being reviewed by the concerned office.',
            },
            IN_PROGRESS: {
                title: 'In Progress',
                description: 'Action is being taken on your grievance.',
            },
            RESOLVED: {
                title: 'Resolved',
                description: 'Your grievance has been resolved.',
            },
            REJECTED: {
                title: 'Rejected',
                description: 'Your application was rejected. Please contact the office for details.',
            },
        };

        const flow = ['SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED'];
        const terminalStatuses = new Set(['REJECTED', 'RESOLVED']);
        const activeIndex = flow.indexOf(status);

        if (terminalStatuses.has(status) && status !== 'RESOLVED') {
            return [
                {
                    key: 'SUBMITTED',
                    title: statusMeta.SUBMITTED.title,
                    description: statusMeta.SUBMITTED.description,
                    status: 'completed',
                    at: submittedAt,
                },
                {
                    key: status,
                    title: statusMeta[status]?.title || status,
                    description: statusMeta[status]?.description || 'Status updated.',
                    status: 'completed',
                    at: updatedAt,
                },
            ];
        }

        return flow.map((step, index) => {
            const meta = statusMeta[step] || { title: step, description: '' };
            let stepStatus: 'completed' | 'active' | 'pending' = 'pending';
            let at: Date | null = null;

            if (activeIndex === -1) {
                stepStatus = index === 0 ? 'completed' : 'pending';
                at = index === 0 ? submittedAt : null;
            } else if (index < activeIndex) {
                stepStatus = 'completed';
                at = index === 0 ? submittedAt : updatedAt;
            } else if (index === activeIndex) {
                stepStatus = 'active';
                at = index === 0 ? submittedAt : updatedAt;
            }

            return {
                key: step,
                title: meta.title,
                description: meta.description,
                status: stepStatus,
                at,
            };
        });
    }

    async getPublicCategories() {
        const rows = await this.categoryModel.findAll({
            where: { is_active: true },
            attributes: ['id', 'name', 'code'],
            order: [['name', 'ASC']],
        });
        return { success: true, data: rows };
    }

    async createPublicGrievance(data: PublicGrievanceDto, file?: Express.Multer.File): Promise<any> {
        try {
            const isQuick = this.isQuickSubmission(data);
            const fields = this.validatePublicSubmissionFields(data, isQuick);

            if (isQuick && !file) {
                throw new HttpException('Photo or document attachment is required', 400);
            }

            const { stateId, districtId, jurisdictionType } = fields;
            const categoryId = fields.isQuick
                ? await this.resolveQuickGrievanceCategory()
                : fields.categoryId!;

            const resolvedLocation = this.buildPublicSubmissionLocation(data, jurisdictionType, stateId, districtId);

            const category = await this.categoryModel.findOne({ where: { id: categoryId, is_active: true } });
            if (!category) throw new HttpException('Invalid grievance category', 400);

            const defaultSubCategory = await this.subCategoryModel.findOne({
                where: { category_id: categoryId, is_active: true },
                order: [['id', 'ASC']],
            });
            const subCategoryId = defaultSubCategory?.id ?? null;
            const matchedPath = await this.grievancePathService.findMatchingPath(categoryId, subCategoryId);
            if (!matchedPath) {
                throw new HttpException('Grievance path is not configured for this category', 400);
            }

            const pathPlain = matchedPath.get({ plain: true }) as any;
            const nodes = pathPlain.nodes || [];
            if (!nodes.length) throw new HttpException('Configured grievance path has no nodes', 500);

            const node0 = nodes.find((n: any) => n.sequence === 0) || nodes[0];
            const assigneeIds = await this.grievancePathService.resolveAssigneesForNode(node0.id);

            const [status, priority] = await Promise.all([
                this.statusModel.findOne({ where: { code: 'ACTIVE', is_active: true } }),
                this.priorityModel.findByPk(matchedPath.priority_id),
            ]);

            if (!status) throw new HttpException(`Ticket status 'ACTIVE' not found`, 500);
            if (!priority) throw new HttpException(`Priority not found for path`, 500);

            let image_url: string | null = null;
            if (file) {
                const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
                const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
                const originalName = file.originalname?.toLowerCase() || '';
                const hasAllowedExtension = allowedExtensions.some((ext) => originalName.endsWith(ext));
                const hasAllowedMimeType = file.mimetype
                    ? allowedMimeTypes.includes(file.mimetype.toLowerCase())
                    : false;
                if (!hasAllowedExtension || !hasAllowedMimeType) {
                    throw new HttpException('Only PDF and image files (JPG, JPEG, PNG) are allowed', 400);
                }
                image_url = getGrievanceFileUrl(file.filename);
            }

            const createdAt = new Date();
            const resolutionHours = priority.resolution_hours ?? SLA_HOURS.ROUTINE;
            const sla_due_at = calculateSlaDueDate(createdAt, resolutionHours);

            const grievance = await this.grievanceModel.create({
                public_ticket_no: this.generateTicketNo(),
                source: 'public',
                path_id: matchedPath.id,
                current_node_sequence: node0.sequence,
                category_id: categoryId,
                sub_category_id: subCategoryId,
                subject: fields.subject,
                description: fields.description || '—',
                status_id: status.id,
                priority_id: priority.id,
                full_name: fields.fullName,
                mobile_number: fields.mobile,
                aadhaar_or_voter_id: fields.aadhaar,
                permanent_address: fields.address,
                jurisdiction_type: jurisdictionType,
                location_state_id: resolvedLocation.state.id,
                location_district_id: resolvedLocation.district.id,
                location_area_id: resolvedLocation.area.id,
                location_sub_area_id: resolvedLocation.subArea?.id ?? null,
                location_settlement_id: resolvedLocation.settlement?.id ?? null,
                location_state_name: resolvedLocation.state.name,
                location_district_name: resolvedLocation.district.name,
                location_area_name: resolvedLocation.area.name,
                location_sub_area_name: resolvedLocation.subArea?.name ?? null,
                location_settlement_name: resolvedLocation.settlement?.name ?? null,
                location_description: fields.locationDescription,
                gps_latitude: data.gps_latitude || null,
                gps_longitude: data.gps_longitude || null,
                declaration_accepted: true,
                image_url,
                current_assigned_employee_id: assigneeIds.slice(0, 5),
                sla_due_at,
            });

            for (const employeeId of assigneeIds.slice(0, 5)) {
                await this.grievanceExecutionModel.create({
                    grievance_id: grievance.id,
                    from_id: 'system',
                    to_id: employeeId,
                    title: 'Initial assignment',
                    remarks: `Assigned at path node: ${node0.name}`,
                    action_type: EXECUTION_ACTION_TYPES.ASSIGNMENT,
                } as any);
            }

            if (assigneeIds.length > 0) {
                await this.notificationService.notifyEmployees(
                    assigneeIds,
                    'New Grievance Assigned',
                    `New grievance #${grievance.public_ticket_no} assigned to you at stage "${node0.name}".`,
                    'GRIEVANCE_ASSIGNED',
                    'Grievance',
                    grievance.id,
                );
            }

            return {
                success: true,
                message: 'Grievance submitted successfully',
                data: {
                    id: grievance.id,
                    public_ticket_no: grievance.public_ticket_no,
                    status: this.mapStatusCodeToPublicStep(status.code),
                    createdAt: grievance.createdAt,
                },
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async trackPublicGrievance(ticketNo: string, mobileNumber: string): Promise<any> {
        try {
            const ticket = ticketNo?.trim();
            const mobileCompact = String(mobileNumber ?? '').replace(/\s/g, '');

            if (!ticket) throw new HttpException('Ticket number is required', 400);
            if (mobileCompact.length > 10) throw new HttpException('Mobile number cannot exceed 10 digits', 400);
            if (!/^\d{10}$/.test(mobileCompact)) {
                throw new HttpException('Mobile number must be exactly 10 digits', 400);
            }

            const row = await this.grievanceModel.findOne({
                where: {
                    public_ticket_no: ticket,
                    mobile_number: mobileCompact,
                    source: 'public',
                },
                include: [
                    { model: GrievanceCategory, attributes: ['id', 'name', 'code'] },
                    { model: TicketStatus, attributes: ['id', 'name', 'code'] },
                ],
            });

            if (!row) {
                throw new HttpException('No grievance found for the given ticket number and mobile number', 404);
            }

            const plain = row.get({ plain: true }) as Record<string, any>;
            const statusCode = plain.status?.code || 'ACTIVE';

            return {
                success: true,
                data: {
                    public_ticket_no: plain.public_ticket_no,
                    subject: plain.subject,
                    description: plain.description,
                    status: this.mapStatusCodeToPublicStep(statusCode),
                    jurisdiction_type: plain.jurisdiction_type,
                    category: plain.category ?? null,
                    state: plain.location_state_name ? { name: plain.location_state_name } : null,
                    district: plain.location_district_name ? { name: plain.location_district_name } : null,
                    area: plain.location_area_name ? { name: plain.location_area_name } : null,
                    sub_area: plain.location_sub_area_name ? { name: plain.location_sub_area_name } : null,
                    settlement: plain.location_settlement_name ? { name: plain.location_settlement_name } : null,
                    submitted_at: plain.createdAt,
                    updated_at: plain.updatedAt,
                    timeline: this.buildPublicTrackTimeline(row, statusCode),
                },
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    private async enrichGrievanceWithEmployeeRoles(grievance: any): Promise<any> {
        if (!grievance) return grievance;
        const plain = grievance.get ? grievance.get({ plain: true }) : { ...grievance };
        if (Array.isArray(plain.assignedEmployees) && plain.assignedEmployees.length > 0) {
            plain.assignedEmployees = await attachPrimaryRole(plain.assignedEmployees, this.roleModel);
        }
        if (plain.path_id) {
            const pathData = await this.grievancePathService.getPathWithNodes(Number(plain.path_id));
            if (pathData) {
                plain.path = pathData;
            }
        }
        return plain;
    }

    private async enrichGrievanceListWithEmployeeRoles(grievances: any[]): Promise<any[]> {
        if (!grievances?.length) return grievances;
        return Promise.all(grievances.map((grievance) => this.enrichGrievanceWithEmployeeRoles(grievance)));
    }

    private async sendAssignmentEmail(employeeId: string, ticketNo: string, title: string, description: string, grievanceId: string, resolutionHours?: number): Promise<void> {
        try {
            const employee = await this.employeeModel.findByPk(employeeId);
            if (!employee) return;

            let email = employee.email;

            // Robust fallback: if email is not saved in employeeDetails, find in UserAccount by name and role
            if (!email) {
                const primaryRoleId = getPrimaryRoleId(employee);
                const userAcc = primaryRoleId
                    ? await this.userAccountModel.findOne({
                        where: {
                            name: employee.name,
                            role_id: primaryRoleId,
                        }
                    })
                    : null;
                if (userAcc) {
                    email = userAcc.email;
                }
            }

            if (!email) {
                console.warn(`Could not resolve email for employee: ${employee.name} (ID: ${employee.id})`);
                return;
            }

            const timeMessage = resolutionHours
                ? `you have ${formatResolutionTime(resolutionHours)} to act upon it`
                : 'please act upon it as soon as possible';

            const subject = `New Grievance Assigned - Ticket No: ${ticketNo}`;
            const message = `
                <p>Hello <strong>${employee.name}</strong>,</p>
                <p>A new grievance has been assigned to you, ${timeMessage}.</p>
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 16px;">
                        <span style="font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; background-color: #eff6ff; padding: 4px 10px; border-radius: 99px; display: inline-block;">Ticket No: ${ticketNo}</span>
                    </div>
                    <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 16px; color: #0f172a; font-weight: 600;">${title}</h3>
                    <p style="margin-top: 0; margin-bottom: 0; font-size: 14px; color: #475569; line-height: 1.5; white-space: pre-wrap;">${description}</p>
                </div>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${process.env.FRONTEND_URL}/staff/assigned/${grievanceId}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">View Grievance Details</a>
                </div>
                <p>Please log in to the portal to view the details and update the status of this ticket.</p>
            `;

            await this.mailService.sendMailService(email, subject, message);
            console.log(`Successfully sent grievance assignment email to ${email} for ticket ${ticketNo}`);
        } catch (mailError) {
            console.error('Failed to send grievance assignment email:', mailError);
        }
    }

    private generateTicketNo(): string {
        const prefix = 'GRV';
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(1000 + Math.random() * 9000);
        return `${prefix}-${timestamp}-${random}`;
    }

    async createGrievance(_data: GrievanceDto, _reqUser: any, _file?: any): Promise<any> {
        throw new HttpException('Authenticated student grievance submission is no longer supported. Use the public form.', 410);
    }

    async getAllGrievances(query: any = {}): Promise<any> {
        try {
            const page = query.page ? parseInt(query.page, 10) : 1;
            const limit = query.limit ? parseInt(query.limit, 10) : 10;
            const offset = (page - 1) * limit;

            const where: any = {};

            if (query.status && query.status !== 'All' && query.status !== 'All Status' && query.status !== 'All Statuses') {
                where['$status.name$'] = query.status;
            }

            if (query.category && query.category !== 'All' && query.category !== 'All Categories') {
                where['$category.name$'] = query.category;
            }

            if (query.subCategory && query.subCategory !== 'All' && query.subCategory !== 'All Sub-categories') {
                where['$subCategory.name$'] = query.subCategory;
            }

            if (query.priority && query.priority !== 'All' && query.priority !== 'All Priorities') {
                where['$priority.name$'] = query.priority;
            }

            if (query.employee_id) {
                where.current_assigned_employee_id = {
                    [Op.contains]: [query.employee_id]
                };
            }

            if (query.role_id) {
                const employees = await this.employeeModel.findAll({
                    where: buildEmployeeRoleWhere(Number(query.role_id)),
                    attributes: ['id']
                });
                const employeeIds = employees.map(emp => emp.id);

                if (employeeIds.length > 0) {
                    const overlapClauses = employeeIds.map(empId =>
                        `"Grievance"."current_assigned_employee_id" @> jsonb_build_array('${empId}')`
                    ).join(' OR ');
                    where[Op.and] = where[Op.and] || [];
                    where[Op.and].push(Sequelize.literal(overlapClauses));
                } else {
                    where.id = null; // force empty
                }
            }

            if (query.dateFilter && query.dateFilter !== 'All Time') {
                const now = new Date();
                let startDate: Date | null = null;
                if (query.dateFilter === 'Today') {
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                } else if (query.dateFilter === 'This Week') {
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                } else if (query.dateFilter === 'This Month') {
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                }
                if (startDate) {
                    where.createdAt = {
                        [Op.gte]: startDate
                    };
                }
            }

            if (query.search) {
                const searchPattern = `%${query.search.trim()}%`;
                where[Op.or] = [
                    { public_ticket_no: { [Op.iLike]: searchPattern } },
                    { subject: { [Op.iLike]: searchPattern } },
                    { full_name: { [Op.iLike]: searchPattern } },
                    { mobile_number: { [Op.iLike]: searchPattern } },
                    { '$category.name$': { [Op.iLike]: searchPattern } },
                    { '$subCategory.name$': { [Op.iLike]: searchPattern } },
                ];
            }

            let order: any[] = [['createdAt', 'DESC']];
            if (query.sortField) {
                const sortField = query.sortField;
                const sortOrder = (query.sortOrder && query.sortOrder.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

                switch (sortField) {
                    case 'id':
                        order = [['public_ticket_no', sortOrder]];
                        break;
                    case 'full_name':
                        order = [['full_name', sortOrder]];
                        break;
                    case 'category':
                        order = [[GrievanceCategory, 'name', sortOrder]];
                        break;
                    case 'subCategory':
                        order = [[GrievanceSubCategory, 'name', sortOrder]];
                        break;
                    case 'priority':
                        order = [[TicketPriority, 'resolution_hours', sortOrder]];
                        break;
                    case 'status':
                        order = [[TicketStatus, 'name', sortOrder]];
                        break;
                    case 'date':
                    case 'assignedOn':
                    case 'submittedOn':
                        order = [['createdAt', sortOrder]];
                        break;
                    case 'dueBy':
                        order = [['sla_due_at', sortOrder]];
                        break;
                    default:
                        order = [['createdAt', 'DESC']];
                }
            }

            const { count, rows } = await this.grievanceModel.findAndCountAll({
                where,
                include: [
                    { model: GrievanceCategory, include: [{ model: GrievanceType }] },
                    { model: GrievanceSubCategory },
                    { model: TicketStatus },
                    { model: TicketPriority },
                    {
                        model: EmployeeDetails,
                        as: 'assignedEmployees',
                        on: Sequelize.literal(`"Grievance"."current_assigned_employee_id" @> jsonb_build_array("assignedEmployees"."id"::text)`),
                        required: false,
                    }
                ],
                limit,
                offset,
                distinct: true,
                order,
                subQuery: false,
            });

            // Calculate status counts for UI tabs
            const countsWhere = { ...where };
            delete countsWhere['$status.name$'];

            const statusCountsRaw = await this.grievanceModel.findAll({
                where: countsWhere,
                attributes: [
                    'status_id',
                    [Sequelize.fn('COUNT', Sequelize.col('Grievance.id')), 'count']
                ],
                include: [
                    { model: TicketStatus, attributes: ['name'] },
                    { model: GrievanceCategory, attributes: [] },
                    { model: GrievanceSubCategory, attributes: [] },
                    { model: TicketPriority, attributes: [] }
                ],
                group: ['status_id', 'status.id', 'status.name'],
                raw: true,
                subQuery: false
            }) as any[];

            const statusCounts: Record<string, number> = { All: 0 };
            let total = 0;
            statusCountsRaw.forEach(item => {
                const name = item['status.name'] || 'Unknown';
                const cnt = parseInt(item.count || '0', 10);
                statusCounts[name] = cnt;
                total += cnt;
            });
            statusCounts['All'] = total;

            const overdueCount = await this.grievanceModel.count({
                where: {
                    ...countsWhere,
                    sla_due_at: {
                        [Op.lt]: new Date()
                    },
                    '$status.code$': {
                        [Op.notIn]: ['RESOLVED', 'CLOSED', 'INACTIVE']
                    }
                },
                include: [
                    { model: GrievanceCategory },
                    { model: GrievanceSubCategory },
                    { model: TicketStatus },
                    { model: TicketPriority }
                ],
                distinct: true
            });
            statusCounts['Overdue'] = overdueCount;

            const totalPages = Math.ceil(count / limit);

            const enrichedRows = await this.enrichGrievanceListWithEmployeeRoles(rows);

            return {
                success: true,
                message: 'Grievances fetched successfully',
                data: enrichedRows,
                count,
                page,
                limit,
                totalPages,
                statusCounts
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getGrievanceById(id: string): Promise<any> {
        try {
            const { Op } = require('sequelize');
            const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
            const whereClause = isUuid ? { id } : { public_ticket_no: id };

            const grievance = await this.grievanceModel.findOne({
                where: whereClause,
                include: [
                    { model: GrievanceCategory, include: [{ model: GrievanceType }] },
                    { model: GrievanceSubCategory },
                    { model: TicketStatus },
                    { model: TicketPriority },
                    {
                        model: EmployeeDetails,
                        as: 'assignedEmployees',
                        on: Sequelize.literal(`"Grievance"."current_assigned_employee_id" @> jsonb_build_array("assignedEmployees"."id"::text)`),
                        required: false,
                    }
                ],
            });
            if (!grievance) throw new HttpException('Grievance not found', 404);
            return {
                success: true,
                message: 'Grievance fetched successfully',
                data: await this.enrichGrievanceWithEmployeeRoles(grievance),
            };
        } catch (error: any) {
            console.error('getGrievanceById error:', error);
            require('fs').writeFileSync('api_error.log', error.name + ': ' + error.message + '\n' + error.stack);
            return handleServiceError(error);
        }
    }

    async getGrievanceByTicketNumber(ticketNo: string): Promise<any> {
        try {
            const grievance = await this.grievanceModel.findOne({
                where: { public_ticket_no: ticketNo },
                include: [
                    { model: GrievanceCategory, include: [{ model: GrievanceType }] },
                    { model: GrievanceSubCategory },
                    { model: TicketStatus },
                    { model: TicketPriority },
                    {
                        model: EmployeeDetails,
                        as: 'assignedEmployees',
                        on: Sequelize.literal(`"Grievance"."current_assigned_employee_id" @> jsonb_build_array("assignedEmployees"."id"::text)`),
                        required: false,
                    }
                ],
            });
            if (!grievance) throw new HttpException('Grievance not found', 404);
            return {
                success: true,
                message: 'Grievance fetched successfully by ticket number',
                data: grievance,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async updateGrievance(id: string, data: UpdateGrievanceDto, reqUser?: any): Promise<any> {
        try {
            const grievance = await this.grievanceModel.findByPk(id);
            if (!grievance) throw new HttpException('Grievance not found', 404);

            const updateData = data as any;

            // Never allow current_assigned_employee_id to be cleared through this endpoint.
            // Assignments are managed exclusively via the assignGrievance endpoint.
            delete updateData.current_assigned_employee_id;

            const categoryChanging = updateData.category_id !== undefined;
            const subCategoryChanging = updateData.sub_category_id !== undefined;

            if (categoryChanging || subCategoryChanging) {
                const categoryId = categoryChanging
                    ? Number(updateData.category_id)
                    : grievance.category_id;
                const rawSubCategoryId = subCategoryChanging
                    ? updateData.sub_category_id
                    : grievance.sub_category_id;
                const subCategoryId = rawSubCategoryId === '' || rawSubCategoryId === null || rawSubCategoryId === undefined
                    ? null
                    : Number(rawSubCategoryId);
                const isPublic = grievance.source === 'public';

                if (!Number.isInteger(categoryId) || categoryId <= 0) {
                    throw new HttpException('Valid category is required', 400);
                }
                if (subCategoryId !== null && (!Number.isInteger(subCategoryId) || subCategoryId <= 0)) {
                    throw new HttpException('Valid sub-category is required', 400);
                }
                if (!isPublic && (subCategoryId === null || subCategoryId <= 0)) {
                    throw new HttpException('Valid sub-category is required', 400);
                }

                const category = await this.categoryModel.findOne({ where: { id: categoryId, is_active: true } });
                if (!category) throw new HttpException('Category not found or inactive', 404);

                if (subCategoryId !== null) {
                    const subCategory = await this.subCategoryModel.findOne({ where: { id: subCategoryId, is_active: true } });
                    if (!subCategory) throw new HttpException('Sub-category not found or inactive', 404);
                    if (Number(subCategory.category_id) !== Number(categoryId)) {
                        throw new HttpException('Sub-category does not belong to the selected category', 400);
                    }
                }

                updateData.category_id = categoryId;
                updateData.sub_category_id = subCategoryId;
            }

            const previousCategoryId = grievance.category_id;
            const previousSubCategoryId = grievance.sub_category_id;

            await grievance.update(updateData);

            const updatedGrievance = await this.grievanceModel.findByPk(id, {
                include: [
                    { model: GrievanceCategory, include: [{ model: GrievanceType }] },
                    { model: GrievanceSubCategory },
                    { model: TicketStatus },
                    { model: TicketPriority },
                    {
                        model: EmployeeDetails,
                        as: 'assignedEmployees',
                        on: Sequelize.literal(`"Grievance"."current_assigned_employee_id" @> jsonb_build_array("assignedEmployees"."id"::text)`),
                        required: false,
                    }
                ],
            });

            if (!updatedGrievance) {
                throw new HttpException('Updated grievance not found', 404);
            }

            try {
                const changeParts: string[] = [];
                if (
                    updateData.status_id &&
                    updateData.status_id !== grievance.status_id &&
                    updatedGrievance.status?.name
                ) {
                    changeParts.push(`Status changed to "${updatedGrievance.status.name}"`);
                }
                if (
                    updateData.priority_id &&
                    updateData.priority_id !== grievance.priority_id &&
                    updatedGrievance.priority?.name
                ) {
                    changeParts.push(`Priority changed to "${updatedGrievance.priority.name}"`);
                }
                if (
                    updateData.category_id &&
                    updateData.category_id !== previousCategoryId &&
                    updatedGrievance.category?.name
                ) {
                    changeParts.push(`Category changed to "${updatedGrievance.category.name}"`);
                }
                if (
                    updateData.sub_category_id &&
                    updateData.sub_category_id !== previousSubCategoryId &&
                    updatedGrievance.subCategory?.name
                ) {
                    changeParts.push(`Sub-category changed to "${updatedGrievance.subCategory.name}"`);
                }

                if (changeParts.length > 0) {
                    await this.auditLogService.create({
                        actor_id: reqUser?.id || 1,
                        action: 'UPDATE',
                        entity_type: 'Grievance',
                        entity_id: `GRV-${id}`,
                        metadata: changeParts.join('. '),
                    });
                }
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            // Trigger WebSocket notifications
            try {
                const ticketNo = updatedGrievance.public_ticket_no;
                const statusName = updatedGrievance.status?.name || 'Updated';
                const employeeIds = updatedGrievance.current_assigned_employee_id || [];

                if (employeeIds.length > 0) {
                    let empMsg = `Grievance #${ticketNo} assigned to you has been updated.`;
                    if (updateData.status_id) {
                        empMsg = `Grievance #${ticketNo} status has been updated to "${statusName}".`;
                    }
                    await this.notificationService.notifyEmployees(
                        employeeIds,
                        'Grievance Updated',
                        empMsg,
                        'GRIEVANCE_UPDATED',
                        'Grievance',
                        updatedGrievance.id
                    );
                }

                await this.notificationService.notifyAdmins(
                    'Grievance Updated',
                    `Grievance #${ticketNo} was updated. Status: "${statusName}".`,
                    'GRIEVANCE_UPDATED',
                    'Grievance',
                    updatedGrievance.id
                );
            } catch (notifError) {
                console.error("Failed to send WebSocket notifications for update grievance:", notifError);
            }

            return {
                success: true,
                message: 'Grievance updated successfully',
                data: updatedGrievance,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async reopenGrievance(id: string, remark: string, reqUser?: any): Promise<any> {
        try {
            await verifyNotStudent(reqUser);

            if (!remark || remark.trim() === '') {
                throw new HttpException('Remark is required to reopen a grievance', 400);
            }

            let employee = await this.employeeModel.findOne({ where: { email: reqUser.email } });
            if (!employee) {
                employee = await this.grievancePathService.ensureEmployeeForUser(reqUser);
            }
            if (!employee) {
                throw new HttpException('Employee record not found for current user', 403);
            }

            const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
            const whereClause = isUuid ? { id } : { public_ticket_no: id };

            const [grievance, reopenStatus] = await Promise.all([
                this.grievanceModel.findOne({ where: whereClause }),
                this.statusModel.findOne({ where: { code: 'REOPENED' } })
            ]);

            if (!grievance) throw new HttpException('Grievance not found', 404);
            if (!reopenStatus) throw new HttpException('Reopened status not found', 500);

            const currentStatus = await this.statusModel.findByPk(grievance.status_id);
            if (currentStatus?.code !== 'RESOLVED') {
                throw new HttpException('Only resolved grievances can be reopened', 400);
            }

            let defaultEmployeeIds: string[] = Array.isArray(grievance.current_assigned_employee_id)
                ? grievance.current_assigned_employee_id.filter(Boolean)
                : [];

            if (defaultEmployeeIds.length === 0) {
                if (!grievance.path_id) {
                    throw new HttpException('Grievance path is not configured', 400);
                }
                const node0 = await this.grievancePathService.getNodeForPath(grievance.path_id, 0);
                if (!node0) {
                    throw new HttpException('Path node 0 not found for this grievance', 400);
                }
                defaultEmployeeIds = await this.grievancePathService.resolveAssigneesForNode(node0.id);
            }

            if (defaultEmployeeIds.length === 0) {
                throw new HttpException(
                    'Cannot reopen grievance: no employees are available to assign this ticket to.',
                    400
                );
            }

            const limitedAssignees = defaultEmployeeIds.slice(0, 5);

            const executionPromises: Promise<any>[] = [
                grievance.update({
                    status_id: reopenStatus.id,
                    current_assigned_employee_id: limitedAssignees,
                }),
                this.grievanceExecutionModel.create({
                    title: 'Grievance Reopened',
                    grievance_id: grievance.id,
                    from_id: employee.id,
                    to_id: limitedAssignees[0] || null,
                    remarks: remark,
                    action_type: EXECUTION_ACTION_TYPES.REOPENED,
                } as any),
                this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'UPDATE',
                    entity_type: 'Grievance',
                    entity_id: `GRV-${grievance.id}`,
                    metadata: `Reopened grievance and assigned to default employees`
                }).catch(auditError => console.error("Failed to create audit log:", auditError))
            ];

            limitedAssignees.forEach(empId => {
                executionPromises.push(
                    this.grievanceExecutionModel.create({
                        title: 'Grievance Assigned (Reopened)',
                        grievance_id: grievance.id,
                        from_id: employee.id,
                        to_id: empId,
                        remarks: 'Grievance auto-assigned to default employee upon reopening.',
                        action_type: EXECUTION_ACTION_TYPES.ASSIGNMENT,
                    } as any)
                );

                this.sendAssignmentEmail(empId, grievance.public_ticket_no, grievance.subject, grievance.description, grievance.id);
            });

            await Promise.all(executionPromises);

            try {
                const ticketNo = grievance.public_ticket_no;

                await this.notificationService.notifyEmployees(
                    limitedAssignees,
                    'Grievance Reopened',
                    `Grievance #${ticketNo} has been reopened and assigned to you.`,
                    'GRIEVANCE_REOPENED',
                    'Grievance',
                    grievance.id
                );

                await this.notificationService.notifyAdmins(
                    'Grievance Reopened',
                    `Grievance #${ticketNo} has been reopened by staff.`,
                    'GRIEVANCE_REOPENED',
                    'Grievance',
                    grievance.id
                );
            } catch (notifError) {
                console.error("Failed to send WebSocket notifications for reopen grievance:", notifError);
            }

            return {
                success: true,
                message: 'Grievance reopened successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async deleteGrievance(id: string, reqUser?: any): Promise<any> {
        try {
            const grievance = await this.grievanceModel.findByPk(id);
            if (!grievance) throw new HttpException('Grievance not found', 404);

            await deleteGrievanceDependents(id, {
                grievanceModel: this.grievanceModel,
                grievanceExecutionModel: this.grievanceExecutionModel,
                grievanceChatModel: this.grievanceChatModel,
                grievanceMessagesModel: this.grievanceMessagesModel,
            });

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'DELETE',
                    entity_type: 'Grievance',
                    entity_id: `GRV-${id}`,
                    metadata: `Permanently deleted grievance "${grievance.public_ticket_no}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Grievance deleted successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async forwardGrievance(id: string, reqUser: any, dto: { employee_id?: string; department_id?: number } = {}): Promise<any> {
        try {
            await verifyNotStudent(reqUser);

            let employee = await this.employeeModel.findOne({ where: { email: reqUser.email } });
            if (!employee) {
                employee = await this.grievancePathService.ensureEmployeeForUser(reqUser);
            }
            if (!employee) {
                throw new HttpException('Employee record not found for current user', 403);
            }

            const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
            const whereClause = isUuid ? { id } : { public_ticket_no: id };

            const grievance = await this.grievanceModel.findOne({ where: whereClause });
            if (!grievance) throw new HttpException('Grievance not found', 404);

            if (!grievance.path_id) {
                throw new HttpException('Grievance has no configured path', 400);
            }

            const assignedIds = Array.isArray(grievance.current_assigned_employee_id)
                ? grievance.current_assigned_employee_id.filter(Boolean)
                : [];
            const isAdmin = await isAdminUser(reqUser);
            if (!isAdmin && !assignedIds.includes(employee.id)) {
                throw new HttpException('You are not assigned to this grievance', 403);
            }

            const currentSequence = grievance.current_node_sequence ?? 0;
            const currentNode = await this.grievancePathService.getNodeForPath(grievance.path_id, currentSequence);
            if (!currentNode) {
                throw new HttpException('Current path node not found', 500);
            }

            const currentNodeName = currentNode.name?.trim() || `Stage ${currentSequence + 1}`;

            if (currentNode.is_terminal) {
                const nodeRoleIds = this.getNodeRoleIds(currentNode);
                const callerRoleId = Number(reqUser?.role_id ?? getPrimaryRoleId(employee));
                if (!isAdmin && nodeRoleIds.length > 0 && !nodeRoleIds.includes(callerRoleId)) {
                    throw new HttpException('Your role is not authorized to forward from this stage', 403);
                }

                const employeeId = String(dto?.employee_id || '').trim();
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (!employeeId || !uuidRegex.test(employeeId)) {
                    throw new HttpException('employee_id is required when forwarding from the last path stage', 400);
                }

                const targetEmployee = await this.employeeModel.findOne({
                    where: { id: employeeId, is_active: true },
                });
                if (!targetEmployee) {
                    throw new HttpException('Selected employee not found or inactive', 404);
                }

                const [enrichedTarget] = await attachPrimaryRole(
                    [targetEmployee.get({ plain: true })],
                    this.roleModel,
                ) as any[];
                const targetRoleId = Number(getPrimaryRoleId(enrichedTarget));
                const targetRole = enrichedTarget?.role
                    || await this.roleModel.findOne({ where: { id: targetRoleId, is_active: true } });
                if (!targetRole) {
                    throw new HttpException('Selected employee has no active role', 400);
                }

                let departmentName: string | null = null;
                const departmentId = dto?.department_id != null ? Number(dto.department_id) : null;
                if (departmentId != null && Number.isInteger(departmentId) && departmentId > 0) {
                    const department = await this.departmentModel.findOne({
                        where: { id: departmentId, is_active: true },
                    });
                    if (!department) {
                        throw new HttpException('Selected department not found or inactive', 404);
                    }
                    departmentName = department.name;

                    const deptRoleIds = await this.getDepartmentRoleIds(departmentId);
                    if (!deptRoleIds.length) {
                        throw new HttpException('No roles configured for the selected department', 400);
                    }
                    if (!deptRoleIds.includes(targetRoleId)) {
                        throw new HttpException('Selected employee does not match the department role configuration', 400);
                    }
                }

                const assigneeIds = [employeeId];

                await grievance.update({
                    current_assigned_employee_id: assigneeIds,
                });

                const forwardLabel = departmentName
                    ? `${enrichedTarget.name} (${targetRole.name}, ${departmentName})`
                    : `${enrichedTarget.name} (${targetRole.name})`;

                await this.grievanceExecutionModel.create({
                    grievance_id: grievance.id,
                    from_id: employee.id,
                    to_id: employeeId,
                    title: `Forwarded to ${enrichedTarget.name}`,
                    remarks: `Forwarded from "${currentNodeName}" to ${forwardLabel}`,
                    action_type: EXECUTION_ACTION_TYPES.FORWARD,
                } as any);

                try {
                    await this.auditLogService.create({
                        actor_id: reqUser?.id || 1,
                        action: 'UPDATE',
                        entity_type: 'Grievance',
                        entity_id: `GRV-${grievance.id}`,
                        metadata: `Forwarded grievance to ${forwardLabel} at terminal stage`,
                    });
                } catch (auditError) {
                    console.error('Failed to create audit log:', auditError);
                }

                await this.notificationService.notifyEmployees(
                    assigneeIds,
                    'Grievance Forwarded',
                    `Grievance #${grievance.public_ticket_no} has been forwarded to you (${targetRole.name}).`,
                    'GRIEVANCE_FORWARDED',
                    'Grievance',
                    grievance.id,
                );

                return {
                    success: true,
                    message: 'Grievance forwarded successfully',
                };
            }

            const nextSequence = currentSequence + 1;
            const nextNode = await this.grievancePathService.getNodeForPath(grievance.path_id, nextSequence);
            if (!nextNode) {
                throw new HttpException('No next node in grievance path', 400);
            }

            const nextNodeName = nextNode.name?.trim() || `Stage ${nextSequence + 1}`;
            const assigneeIds = await this.grievancePathService.resolveAssigneesForNode(nextNode.id);
            if (assigneeIds.length === 0) {
                throw new HttpException('No assignees available for the next path node', 400);
            }

            const limitedAssignees = assigneeIds.slice(0, 5);

            await grievance.update({
                current_node_sequence: nextNode.sequence,
                current_assigned_employee_id: limitedAssignees,
            });

            await this.grievanceExecutionModel.create({
                grievance_id: grievance.id,
                from_id: employee.id,
                to_id: limitedAssignees[0] || null,
                title: `Forwarded to ${nextNodeName}`,
                remarks: `Forwarded from "${currentNodeName}" to "${nextNodeName}"`,
                action_type: EXECUTION_ACTION_TYPES.FORWARD,
            } as any);

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'UPDATE',
                    entity_type: 'Grievance',
                    entity_id: `GRV-${grievance.id}`,
                    metadata: `Forwarded grievance to path node "${nextNodeName}"`,
                });
            } catch (auditError) {
                console.error('Failed to create audit log:', auditError);
            }

            await this.notificationService.notifyEmployees(
                limitedAssignees,
                'Grievance Forwarded',
                `Grievance #${grievance.public_ticket_no} has been forwarded to you at stage "${nextNodeName}".`,
                'GRIEVANCE_FORWARDED',
                'Grievance',
                grievance.id,
            );

            return {
                success: true,
                message: 'Grievance forwarded successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async assignGrievance(id: string, employee_ids: string[], reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);

            if (!Array.isArray(employee_ids) || employee_ids.length === 0 || employee_ids.length > 5) {
                throw new HttpException('Must provide an array of 1 to 5 employee IDs', 400);
            }

            const grievance = await this.grievanceModel.findByPk(id, {
                include: [{ model: TicketPriority }]
            });

            if (!grievance) throw new HttpException('Grievance not found', 404);

            const newAssigneesRaw = await this.employeeModel.findAll({
                where: { id: employee_ids },
            });
            const newAssignees = await attachPrimaryRole(
                newAssigneesRaw.map((employee) => employee.get({ plain: true })),
                this.roleModel,
            );

            if (newAssignees.length !== employee_ids.length) {
                throw new HttpException('One or more target employees not found', 404);
            }

            if (newAssignees.some(emp => !emp.is_active)) {
                throw new HttpException('One or more target employees are inactive', 400);
            }

            const blockedRoles = ['STUDENT', ROLE_CODES.ADMIN];
            if (newAssignees.some(emp => blockedRoles.includes(emp.role?.code?.toUpperCase() as any))) {
                throw new HttpException('Cannot assign grievance to a Student or Admin', 400);
            }

            await grievance.update({
                current_assigned_employee_id: employee_ids,
            });

            // Get resolution hours from the priority for email notification
            const resolutionHours = grievance.priority?.resolution_hours ?? undefined;

            // Send assignment email notification asynchronously to all
            employee_ids.forEach(empId => {
                this.sendAssignmentEmail(empId, grievance.public_ticket_no, grievance.subject, grievance.description, grievance.id, resolutionHours);
            });

            const updatedGrievance = await this.grievanceModel.findByPk(id, {
                include: [
                    { model: GrievanceCategory, include: [{ model: GrievanceType }] },
                    { model: GrievanceSubCategory },
                    { model: TicketStatus },
                    { model: TicketPriority },
                    {
                        model: EmployeeDetails,
                        as: 'assignedEmployees',
                        on: Sequelize.literal(`"Grievance"."current_assigned_employee_id" @> jsonb_build_array("assignedEmployees"."id"::text)`),
                        required: false,
                    }
                ],
            });

            if (!updatedGrievance) {
                throw new HttpException('Updated grievance not found', 404);
            }

            try {
                const assigneeNames = newAssignees.map((e) => e.name).join(', ') || 'employee';
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'UPDATE',
                    entity_type: 'Grievance',
                    entity_id: `GRV-${id}`,
                    metadata: `Assigned grievance to ${assigneeNames}`,
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            try {
                const ticketNo = updatedGrievance.public_ticket_no;
                const empNames = updatedGrievance.assignedEmployees?.map(e => e.name).join(', ') || 'Unassigned';

                await this.notificationService.notifyEmployees(
                    employee_ids,
                    'Grievance Assigned',
                    `Grievance #${ticketNo} - "${updatedGrievance.subject}" has been assigned to you.`,
                    'GRIEVANCE_ASSIGNED',
                    'Grievance',
                    updatedGrievance.id
                );

                await this.notificationService.notifyAdmins(
                    'Grievance Reassigned',
                    `Grievance #${ticketNo} has been reassigned to: ${empNames}.`,
                    'GRIEVANCE_ASSIGNED',
                    'Grievance',
                    updatedGrievance.id
                );
            } catch (notifError) {
                console.error("Failed to send WebSocket notifications for assign grievance:", notifError);
            }

            return {
                success: true,
                message: 'Grievance assigned successfully',
                data: await this.enrichGrievanceWithEmployeeRoles(updatedGrievance),
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getGrievancesByRoleId(roleId: number, query: any = {}): Promise<any> {
        return this.getAllGrievances({ ...query, role_id: roleId });
    }

    async getGrievancesByEmployeeId(employeeId: string, query: any = {}): Promise<any> {
        return this.getAllGrievances({ ...query, employee_id: employeeId });
    }

    /**
     * Get grievances assigned to one or more employees.
     * Returns any grievance whose current_assigned_employee_id JSONB array
     * contains at least one of the supplied employee IDs.
     *
     * @param employeeIds - Array of employee UUIDs (single or multiple)
     * @param query       - Pagination / filter query params
     */
    async getGrievancesByEmployeeIds(employeeIds: string[], query: any = {}): Promise<any> {
        try {
            if (!employeeIds || employeeIds.length === 0) {
                throw new HttpException('At least one employee_id is required', 400);
            }

            // Validate that every supplied ID actually exists
            const employees = await this.employeeModel.findAll({
                where: { id: employeeIds },
                attributes: ['id', 'name'],
            });

            if (employees.length === 0) {
                throw new HttpException('No employees found for the supplied IDs', 404);
            }

            const page = query.page ? parseInt(query.page, 10) : 1;
            const limit = query.limit ? parseInt(query.limit, 10) : 10;
            const offset = (page - 1) * limit;

            // Build an OR clause: grievance must contain at least one of the IDs
            const overlapClauses = employeeIds.map(
                empId => `"Grievance"."current_assigned_employee_id" @> jsonb_build_array('${empId}')`
            ).join(' OR ');

            const where: any = {
                [Op.and]: [Sequelize.literal(`(${overlapClauses})`)],
            };

            // Optional status filter
            if (query.status && query.status !== 'All' && query.status !== 'All Status') {
                where['$status.name$'] = query.status;
            }

            const { count, rows } = await this.grievanceModel.findAndCountAll({
                where,
                include: [
                    { model: GrievanceCategory, include: [{ model: GrievanceType }] },
                    { model: GrievanceSubCategory },
                    { model: TicketStatus },
                    { model: TicketPriority },
                    {
                        model: EmployeeDetails,
                        as: 'assignedEmployees',
                        on: Sequelize.literal(`"Grievance"."current_assigned_employee_id" @> jsonb_build_array("assignedEmployees"."id"::text)`),
                        required: false,
                    },
                ],
                limit,
                offset,
                distinct: true,
                order: [['createdAt', 'DESC']],
                subQuery: false,
            });

            return {
                success: true,
                message: 'Grievances fetched successfully',
                employees: employees.map(e => ({ id: e.id, name: e.name })),
                data: rows,
                count,
                page,
                limit,
                totalPages: Math.ceil(count / limit),
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getGrievanceTimeline(id: string, reqUser?: any): Promise<any> {
        try {
            const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
            const whereClause = isUuid ? { id } : { public_ticket_no: id };

            const grievance = await this.grievanceModel.findOne({
                where: whereClause,
                include: [
                    { model: TicketStatus },
                    {
                        model: EmployeeDetails,
                        as: 'assignedEmployees',
                        on: Sequelize.literal(`"Grievance"."current_assigned_employee_id" @> jsonb_build_array("assignedEmployees"."id"::text)`),
                        required: false,
                    },
                ],
            });

            if (!grievance) {
                throw new HttpException('Grievance not found', 404);
            }

            const grievanceId = grievance.id;
            const plainGrievance = await this.enrichGrievanceWithEmployeeRoles(grievance) as any;

            const [executions, auditLogs] = await Promise.all([
                this.grievanceExecutionModel.findAll({
                    where: { grievance_id: grievanceId },
                    include: [
                        {
                            model: EmployeeDetails,
                            as: 'to',
                        },
                    ],
                    order: [['createdAt', 'ASC']],
                }),
                this.auditLogModel.findAll({
                    where: {
                        entity_type: 'Grievance',
                        entity_id: `GRV-${grievanceId}`,
                    },
                    order: [['createdAt', 'ASC']],
                }),
            ]);

            const fromIds = [...new Set(executions.map((e) => e.from_id).filter(Boolean))];
            const employeeFromIds = fromIds.filter((id) => id !== 'system');
            const fromEmployees = employeeFromIds.length
                ? await this.employeeModel.findAll({
                    where: { id: { [Op.in]: employeeFromIds } },
                })
                : [];

            const enrichedFromEmployees = await attachPrimaryRole(
                fromEmployees.map((employee) => employee.get({ plain: true })),
                this.roleModel,
            );
            const actorMap = new Map<string, { name: string; role: string }>();
            actorMap.set('system', { name: 'System', role: 'System' });
            enrichedFromEmployees.forEach((e) =>
                actorMap.set(e.id, { name: e.name, role: e.role?.name || 'Staff' }),
            );

            const auditActorIds = [...new Set(auditLogs.map((a) => a.actor_id))];
            const auditUsers = auditActorIds.length
                ? await this.userAccountModel.findAll({ where: { id: { [Op.in]: auditActorIds } } })
                : [];
            const auditUserMap = new Map(auditUsers.map((u) => [u.id, u]));

            const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
            const auditMetadataText = auditLogs.map((l) => l.metadata || '').join(' ');
            const uuidsInAudit = [
                ...new Set(
                    (auditMetadataText.match(UUID_REGEX) || []).map((u) => u.toLowerCase()),
                ),
            ];
            const uuidNameMap = new Map<string, string>();
            if (uuidsInAudit.length) {
                const auditEmployees = await this.employeeModel.findAll({
                    where: { id: { [Op.in]: uuidsInAudit } },
                    attributes: ['id', 'name'],
                });
                auditEmployees.forEach((e) => uuidNameMap.set(e.id.toLowerCase(), e.name));
            }

            const resolveNamesInText = (text: string) => {
                if (!text) return text;
                let result = text;
                uuidNameMap.forEach((name, uuid) => {
                    result = result.replace(new RegExp(uuid, 'gi'), name);
                });
                return result;
            };

            const events: any[] = [];

            events.push({
                id: `created-${grievanceId}`,
                actionType: 'CREATED',
                title: 'Ticket Created',
                description: 'Grievance submitted.',
                actorName: plainGrievance.full_name || 'Complainant',
                actorRole: 'Complainant',
                createdAt: plainGrievance.createdAt,
            });

            for (const exec of executions) {
                const plain = exec.get({ plain: true }) as any;
                const actor = actorMap.get(plain.from_id) || { name: 'System', role: 'System' };
                let target: { name: string; role?: string } | undefined;
                if (plain.to) {
                    const [enrichedTo] = await attachPrimaryRole([plain.to], this.roleModel);
                    target = { name: enrichedTo.name, role: enrichedTo.role?.name || 'Staff' };
                }

                const actionType = plain.action_type || EXECUTION_ACTION_TYPES.ASSIGNMENT;
                let title = plain.title || 'Ticket Updated';
                let description = plain.remarks || plain.title || '';

                if (actionType === EXECUTION_ACTION_TYPES.ASSIGNMENT) {
                    title = 'Ticket Assigned';
                    description = target
                        ? `Ticket assigned to ${target.name}${target.role ? ` (${target.role})` : ''} for resolution.`
                        : (plain.remarks || 'Ticket was assigned to staff for handling.');
                } else if (actionType === EXECUTION_ACTION_TYPES.REOPENED) {
                    title = 'Ticket Reopened';
                    description = plain.remarks || 'This ticket was reopened.';
                } else if (actionType === EXECUTION_ACTION_TYPES.FORWARD) {
                    title = 'Ticket Forwarded';
                    description = plain.remarks || 'Ticket was forwarded to the next stage.';
                }

                events.push({
                    id: plain.id,
                    actionType,
                    title,
                    description,
                    remarks: plain.remarks || undefined,
                    actorName: actor.name,
                    actorRole: actor.role,
                    targetName: target?.name,
                    targetRole: target?.role,
                    createdAt: plain.createdAt,
                });
            }

            if (plainGrievance.first_response_at) {
                const responder = plainGrievance.assignedEmployees?.[0];
                events.push({
                    id: `first-response-${grievanceId}`,
                    actionType: 'FIRST_RESPONSE',
                    title: 'First Response',
                    description: 'Staff responded to this ticket.',
                    actorName: responder?.name || 'Staff',
                    actorRole: responder?.role?.name || 'Staff',
                    createdAt: plainGrievance.first_response_at,
                });
            }

            if (plainGrievance.resolved_at) {
                const resolver = plainGrievance.assignedEmployees?.[0];
                events.push({
                    id: `resolved-${grievanceId}`,
                    actionType: 'RESOLUTION',
                    title: 'Resolved',
                    description: 'This ticket has been marked as resolved.',
                    actorName: resolver?.name || 'Staff',
                    actorRole: resolver?.role?.name || 'Staff',
                    createdAt: plainGrievance.resolved_at,
                });
            }

            const auditEvents: any[] = [];
            for (const log of auditLogs) {
                const plain = log.get({ plain: true }) as any;
                if (plain.action === 'CREATE') {
                    continue;
                }
                const user = auditUserMap.get(plain.actor_id);
                const metadata = resolveNamesInText(plain.metadata || '').trim();
                const lower = metadata.toLowerCase();

                let actionType = 'UPDATED';
                let title = 'Ticket Updated';
                let description = metadata || 'Ticket details were updated.';
                let isGeneric = false;

                if (lower.startsWith('assigned grievance to')) {
                    const assignee = metadata.replace(/^assigned grievance to\s*/i, '').trim();
                    actionType = 'REASSIGNMENT';
                    title = 'Ticket Reassigned';
                    description = assignee
                        ? `This ticket was reassigned to ${assignee} for handling.`
                        : 'This ticket was reassigned to a staff member.';
                } else if (lower.includes('status changed to') || lower.includes('priority changed to')) {
                    actionType = 'STATUS_CHANGE';
                    title = 'Status & Priority Updated';
                    description = metadata;
                } else if (lower === 'updated grievance details') {
                    isGeneric = true;
                    description = 'Ticket details were updated.';
                }

                auditEvents.push({
                    id: `audit-${plain.id}`,
                    actionType,
                    title,
                    description,
                    actorName: user?.name || 'System',
                    actorRole: 'Staff',
                    createdAt: plain.createdAt,
                    isGeneric,
                });
            }

            const filteredAuditEvents = auditEvents.filter((event, idx, arr) => {
                if (!event.isGeneric) return true;
                const eventTime = new Date(event.createdAt).getTime();
                return !arr.some(
                    (other, otherIdx) =>
                        otherIdx !== idx &&
                        other.actorName === event.actorName &&
                        !other.isGeneric &&
                        Math.abs(new Date(other.createdAt).getTime() - eventTime) < 5000,
                );
            });

            const MERGE_WINDOW_MS = 5000;
            const mergedAuditEvents: any[] = [];
            for (const event of filteredAuditEvents) {
                const last = mergedAuditEvents[mergedAuditEvents.length - 1];
                const eventTime = new Date(event.createdAt).getTime();
                if (
                    last &&
                    last.actorName === event.actorName &&
                    Math.abs(eventTime - new Date(last.createdAt).getTime()) < MERGE_WINDOW_MS
                ) {
                    const descriptions = [last.description, event.description].filter(Boolean);
                    last.description = descriptions.join(' ');
                    if (last.actionType !== event.actionType) {
                        last.actionType = 'UPDATED';
                        last.title = 'Ticket Updated';
                    }
                    last.id = `${last.id}+${event.id}`;
                    continue;
                }
                mergedAuditEvents.push({ ...event });
            }

            for (const event of mergedAuditEvents) {
                const { isGeneric, ...timelineEvent } = event;
                events.push(timelineEvent);
            }

            events.sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            );

            return {
                success: true,
                message: 'Grievance timeline fetched successfully',
                data: events,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

}
