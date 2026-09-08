import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional, NonAttribute } from 'sequelize';
import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { GrievanceCategory } from '../../grievanceCategory/models/grievanceCategory.model';
import { GrievancePath } from '../../grievancePath/models/grievancePath.model';
import { GrievanceSubCategory } from '../../grievanceSubCategory/models/grievanceSubCategory.model';
import { TicketStatus } from '../../ticketStatus/models/ticketStatus.model';
import { TicketPriority } from '../../ticketPriority/models/ticketPriority.model';
import { EmployeeDetails } from '../../employeeDetails/models/employeeDetails.model';

@Table({
    tableName: 'grievance_details',
    timestamps: true,
})
export class Grievance extends Model<
    InferAttributes<Grievance>,
    InferCreationAttributes<Grievance>
> {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: CreationOptional<string>;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    declare public_ticket_no: string;

    @Column({
        type: DataType.STRING(20),
        allowNull: false,
        defaultValue: 'public',
    })
    declare source: CreationOptional<string>;

    @ForeignKey(() => GrievancePath)
    @Column({ type: DataType.INTEGER, allowNull: true })
    declare path_id: CreationOptional<number | null>;

    @BelongsTo(() => GrievancePath)
    declare path: NonAttribute<GrievancePath>;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare current_node_sequence: CreationOptional<number>;

    @ForeignKey(() => GrievanceCategory)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare category_id: number;

    @BelongsTo(() => GrievanceCategory)
    declare category: NonAttribute<GrievanceCategory>;

    @ForeignKey(() => GrievanceSubCategory)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare sub_category_id: CreationOptional<number | null>;

    @BelongsTo(() => GrievanceSubCategory)
    declare subCategory: NonAttribute<GrievanceSubCategory>;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare subject: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    declare description: string;

    @ForeignKey(() => TicketStatus)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare status_id: number;

    @BelongsTo(() => TicketStatus)
    declare status: NonAttribute<TicketStatus>;

    @ForeignKey(() => TicketPriority)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare priority_id: number;

    @BelongsTo(() => TicketPriority)
    declare priority: NonAttribute<TicketPriority>;

    @Column({
        type: DataType.JSONB,
        allowNull: true,
        defaultValue: []
    })
    declare current_assigned_employee_id: CreationOptional<string[]>;

    @HasMany(() => EmployeeDetails, { foreignKey: 'id', constraints: false })
    declare assignedEmployees: NonAttribute<EmployeeDetails[]>;



    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare first_response_at: CreationOptional<Date>;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare resolved_at: CreationOptional<Date>;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare sla_due_at: CreationOptional<Date>;

    @Column({
        type: DataType.STRING(1000),
        allowNull: true,
    })
    declare image_url: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(255), allowNull: true })
    declare full_name: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(10), allowNull: true })
    declare mobile_number: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(12), allowNull: true })
    declare aadhaar_or_voter_id: CreationOptional<string | null>;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare permanent_address: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(20), allowNull: true })
    declare jurisdiction_type: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(20), allowNull: true })
    declare location_state_id: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(20), allowNull: true })
    declare location_district_id: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(30), allowNull: true })
    declare location_area_id: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(30), allowNull: true })
    declare location_sub_area_id: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(30), allowNull: true })
    declare location_settlement_id: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(255), allowNull: true })
    declare location_state_name: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(255), allowNull: true })
    declare location_district_name: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(255), allowNull: true })
    declare location_area_name: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(255), allowNull: true })
    declare location_sub_area_name: CreationOptional<string | null>;

    @Column({ type: DataType.STRING(255), allowNull: true })
    declare location_settlement_name: CreationOptional<string | null>;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare location_description: CreationOptional<string | null>;

    @Column({ type: DataType.DECIMAL(10, 7), allowNull: true })
    declare gps_latitude: CreationOptional<string | null>;

    @Column({ type: DataType.DECIMAL(10, 7), allowNull: true })
    declare gps_longitude: CreationOptional<string | null>;

    @Column({ type: DataType.BOOLEAN, allowNull: true })
    declare declaration_accepted: CreationOptional<boolean | null>;

    @Column({
        type: DataType.DATE,
        defaultValue: DataType.NOW,
    })
    declare createdAt: CreationOptional<Date>;

    @Column({
        type: DataType.DATE,
        defaultValue: DataType.NOW,
    })
    declare updatedAt: CreationOptional<Date>;
}
