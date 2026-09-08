import type { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute } from 'sequelize';
import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';
import { District } from './district.model';
import { GramPanchayatWard } from './gramPanchayatWard.model';
import { Village } from './village.model';

@Table({ tableName: 'blocks', timestamps: true })
export class Block extends Model<InferAttributes<Block>, InferCreationAttributes<Block>> {
    @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
    declare id: CreationOptional<number>;

    @Column({ type: DataType.STRING(20), allowNull: false, unique: true })
    declare external_id: string;

    @ForeignKey(() => District)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare district_id: number;

    @BelongsTo(() => District)
    declare district: NonAttribute<District>;

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare name: string;

    @Column({ type: DataType.BOOLEAN, defaultValue: true })
    declare is_active: CreationOptional<boolean>;

    @HasMany(() => GramPanchayatWard)
    declare gram_panchayat_wards: NonAttribute<GramPanchayatWard[]>;

    @HasMany(() => Village)
    declare villages: NonAttribute<Village[]>;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}
