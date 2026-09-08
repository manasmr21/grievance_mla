import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional, NonAttribute } from 'sequelize';
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Department } from '../../department/models/department.model';
import { Role } from '../../roles/models/roles.model';

@Table({
    tableName: 'employee_details',
    timestamps: true,
})
export class EmployeeDetails extends Model<
    InferAttributes<EmployeeDetails>,
    InferCreationAttributes<EmployeeDetails>
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
    })
    declare name: string;

    @ForeignKey(() => Role)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare role_id: number;

    @BelongsTo(() => Role)
    declare role: NonAttribute<Role>;

    @ForeignKey(() => Department)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare department_id: CreationOptional<number>;

    @BelongsTo(() => Department)
    declare department: NonAttribute<Department>;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare email: CreationOptional<string>;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare mobile_number: CreationOptional<string>;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare is_active: CreationOptional<boolean>;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    declare createdAt: CreationOptional<Date>;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    declare updatedAt: CreationOptional<Date>;
}
