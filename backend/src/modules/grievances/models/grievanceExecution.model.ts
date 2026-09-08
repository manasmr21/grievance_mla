import type {
    CreationOptional,
    InferAttributes,
    InferCreationAttributes,
    NonAttribute,
} from "sequelize";

import {
    BelongsTo,
    Column,
    DataType,
    ForeignKey,
    Model,
    Table,
} from "sequelize-typescript";
import { EmployeeDetails } from "src/modules/employeeDetails/models/employeeDetails.model";
import { Grievance } from "./grievance.model";


@Table({
    tableName: 'grievance_execution',
    timestamps: true,
})
export class GrievanceExecution extends Model<
    InferAttributes<GrievanceExecution>,
    InferCreationAttributes<GrievanceExecution>
> {

    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: CreationOptional<string>;

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
    })
    declare title: string;

    @ForeignKey(() => Grievance)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare grievance_id: string;

    @BelongsTo(() => Grievance, { onDelete: 'CASCADE' })
    declare grievance: NonAttribute<Grievance>;

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
    })
    declare from_id: string;

    @ForeignKey(() => EmployeeDetails)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare to_id: string;

    @BelongsTo(() => EmployeeDetails, {
        foreignKey: 'to_id',
        as: 'to',
    })
    declare to: EmployeeDetails;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare remarks: string;

    @Column({
        type: DataType.STRING(255),
        allowNull: true,
    })
    declare attachment: string;

    // Action type to distinguish different execution types
    @Column({
        type: DataType.STRING(50),
        allowNull: false,
        defaultValue: 'ASSIGNMENT',
    })
    declare action_type: CreationOptional<string>; // ASSIGNMENT, REASSIGNMENT, RESOLUTION, REOPENED

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