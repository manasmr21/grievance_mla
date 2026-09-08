import type { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute } from 'sequelize';
import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';
import { Block } from './block.model';
import { Village } from './village.model';

@Table({ tableName: 'gram_panchayat_wards', timestamps: true })
export class GramPanchayatWard extends Model<
    InferAttributes<GramPanchayatWard>,
    InferCreationAttributes<GramPanchayatWard>
> {
    @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
    declare id: CreationOptional<number>;

    @Column({ type: DataType.STRING(20), allowNull: false, unique: true })
    declare external_id: string;

    @ForeignKey(() => Block)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare block_id: number;

    @BelongsTo(() => Block)
    declare block: NonAttribute<Block>;

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare name: string;

    @Column({ type: DataType.STRING(10), allowNull: true })
    declare type: CreationOptional<string | null>;

    @Column({ type: DataType.BOOLEAN, defaultValue: true })
    declare is_active: CreationOptional<boolean>;

    @HasMany(() => Village)
    declare villages: NonAttribute<Village[]>;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}
