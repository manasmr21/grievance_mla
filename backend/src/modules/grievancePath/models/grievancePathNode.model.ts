import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional, NonAttribute } from 'sequelize';
import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { GrievancePath } from './grievancePath.model';
import { GrievancePathNodeRole } from './grievancePathNodeRole.model';

@Table({ tableName: 'grievance_path_node', timestamps: true })
export class GrievancePathNode extends Model<
    InferAttributes<GrievancePathNode>,
    InferCreationAttributes<GrievancePathNode>
> {
    @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
    declare id: CreationOptional<number>;

    @ForeignKey(() => GrievancePath)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare path_id: number;

    @BelongsTo(() => GrievancePath)
    declare path: NonAttribute<GrievancePath>;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare sequence: number;

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare name: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare description: string | null;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare is_terminal: CreationOptional<boolean>;

    @HasMany(() => GrievancePathNodeRole)
    declare nodeRoles: NonAttribute<GrievancePathNodeRole[]>;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}
