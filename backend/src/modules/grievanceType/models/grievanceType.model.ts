import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional, NonAttribute } from 'sequelize';
import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { GrievanceCategory } from '../../grievanceCategory/models/grievanceCategory.model';

@Table({
    tableName: 'types',
    timestamps: true,
})
export class GrievanceType extends Model<
    InferAttributes<GrievanceType>,
    InferCreationAttributes<GrievanceType>
> {
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    })
    declare id: CreationOptional<number>;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare name: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: {
            name: 'types_code_unique',
            msg: 'This type already exists',
        },
    })
    declare code: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    declare is_active: CreationOptional<boolean>;

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

    @HasMany(() => GrievanceCategory, { onDelete: 'RESTRICT' })
    declare categories: NonAttribute<GrievanceCategory[]>;
}
