import type { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute } from 'sequelize';
import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';
import { State } from './state.model';
import { Block } from './block.model';

@Table({ tableName: 'districts', timestamps: true })
export class District extends Model<InferAttributes<District>, InferCreationAttributes<District>> {
    @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
    declare id: CreationOptional<number>;

    @Column({ type: DataType.STRING(20), allowNull: false, unique: true })
    declare external_id: string;

    @ForeignKey(() => State)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare state_id: number;

    @BelongsTo(() => State)
    declare state: NonAttribute<State>;

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare name: string;

    @Column({ type: DataType.BOOLEAN, defaultValue: true })
    declare is_active: CreationOptional<boolean>;

    @HasMany(() => Block)
    declare blocks: NonAttribute<Block[]>;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}
