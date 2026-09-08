import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional, NonAttribute } from 'sequelize';
import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { GrievanceType } from '../../grievanceType/models/grievanceType.model';
import { GrievanceCategory } from '../../grievanceCategory/models/grievanceCategory.model';
import { GrievanceSubCategory } from '../../grievanceSubCategory/models/grievanceSubCategory.model';
import { TicketPriority } from '../../ticketPriority/models/ticketPriority.model';
import { GrievancePathNode } from './grievancePathNode.model';

@Table({ tableName: 'grievance_path', timestamps: true })
export class GrievancePath extends Model<
    InferAttributes<GrievancePath>,
    InferCreationAttributes<GrievancePath>
> {
    @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
    declare id: CreationOptional<number>;

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare name: string;

    @ForeignKey(() => GrievanceType)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare type_id: number;

    @BelongsTo(() => GrievanceType)
    declare type: NonAttribute<GrievanceType>;

    @ForeignKey(() => GrievanceCategory)
    @Column({ type: DataType.INTEGER, allowNull: true })
    declare category_id: number | null;

    @BelongsTo(() => GrievanceCategory)
    declare category: NonAttribute<GrievanceCategory | null>;

    @ForeignKey(() => GrievanceSubCategory)
    @Column({ type: DataType.INTEGER, allowNull: true })
    declare sub_category_id: number | null;

    @BelongsTo(() => GrievanceSubCategory)
    declare subCategory: NonAttribute<GrievanceSubCategory | null>;

    @ForeignKey(() => TicketPriority)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare priority_id: number;

    @BelongsTo(() => TicketPriority)
    declare priority: NonAttribute<TicketPriority>;

    @Column({ type: DataType.BOOLEAN, defaultValue: true })
    declare is_active: CreationOptional<boolean>;

    @HasMany(() => GrievancePathNode)
    declare nodes: NonAttribute<GrievancePathNode[]>;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}
