import type { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute } from 'sequelize';
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Block } from './block.model';
import { GramPanchayatWard } from './gramPanchayatWard.model';

@Table({ tableName: 'villages', timestamps: true })
export class Village extends Model<InferAttributes<Village>, InferCreationAttributes<Village>> {
    @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
    declare id: CreationOptional<number>;

    @Column({ type: DataType.STRING(20), allowNull: false, unique: true })
    declare external_id: string;

    @ForeignKey(() => Block)
    @Column({ type: DataType.INTEGER, allowNull: true })
    declare block_id: CreationOptional<number | null>;

    @BelongsTo(() => Block)
    declare block: NonAttribute<Block>;

    @ForeignKey(() => GramPanchayatWard)
    @Column({ type: DataType.INTEGER, allowNull: true })
    declare gram_panchayat_ward_id: CreationOptional<number | null>;

    @BelongsTo(() => GramPanchayatWard)
    declare gram_panchayat_ward: NonAttribute<GramPanchayatWard>;

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare name: string;

    @Column({ type: DataType.BOOLEAN, defaultValue: true })
    declare is_active: CreationOptional<boolean>;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}
