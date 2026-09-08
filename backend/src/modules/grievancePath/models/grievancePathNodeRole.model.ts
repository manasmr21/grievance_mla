import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional, NonAttribute } from 'sequelize';
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { GrievancePathNode } from './grievancePathNode.model';
import { Role } from '../../roles/models/roles.model';

@Table({ tableName: 'grievance_path_node_roles', timestamps: true })
export class GrievancePathNodeRole extends Model<
    InferAttributes<GrievancePathNodeRole>,
    InferCreationAttributes<GrievancePathNodeRole>
> {
    @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
    declare id: CreationOptional<number>;

    @ForeignKey(() => GrievancePathNode)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare node_id: number;

    @BelongsTo(() => GrievancePathNode)
    declare node: NonAttribute<GrievancePathNode>;

    @ForeignKey(() => Role)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare role_id: number;

    @BelongsTo(() => Role)
    declare role: NonAttribute<Role>;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1 })
    declare sort_order: CreationOptional<number>;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}
