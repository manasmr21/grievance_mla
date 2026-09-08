import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional, NonAttribute } from 'sequelize';
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { GrievanceCategory } from '../../grievanceCategory/models/grievanceCategory.model';

@Table({
    tableName: 'grievance_sub_category',
    timestamps: true,
})
export class GrievanceSubCategory extends Model<
    InferAttributes<GrievanceSubCategory>,
    InferCreationAttributes<GrievanceSubCategory>
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
            name: 'grievance_sub_category_code_unique',
            msg: 'This sub category already exists',
        },
    })
    declare code: string;

    @ForeignKey(() => GrievanceCategory)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare category_id: number;

    @BelongsTo(() => GrievanceCategory, { onDelete: 'RESTRICT' })
    declare category: NonAttribute<GrievanceCategory>;

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
}
