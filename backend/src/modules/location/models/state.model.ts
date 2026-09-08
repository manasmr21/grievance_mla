import type { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute } from 'sequelize';
import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { District } from './district.model';

@Table({ tableName: 'states', timestamps: true })
export class State extends Model<InferAttributes<State>, InferCreationAttributes<State>> {
    @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
    declare id: CreationOptional<number>;

    @Column({ type: DataType.STRING(20), allowNull: false, unique: true })
    declare external_id: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare name: string;

    @Column({ type: DataType.BOOLEAN, defaultValue: true })
    declare is_active: CreationOptional<boolean>;

    @HasMany(() => District)
    declare districts: NonAttribute<District[]>;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}
