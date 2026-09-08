import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional } from 'sequelize';
import { Model, Table, Column, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { UserAccount } from '../../userAccount/models/user.model';

@Table({
    tableName: 'notifications',
    timestamps: true,
})
export class Notification extends Model<
    InferAttributes<Notification>,
    InferCreationAttributes<Notification>
> {
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    })
    declare id: CreationOptional<number>;

    @ForeignKey(() => UserAccount)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare user_id: number;

    @BelongsTo(() => UserAccount)
    declare user: UserAccount;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare title: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    declare message: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare type: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    })
    declare is_read: CreationOptional<boolean>;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare entity_type: CreationOptional<string | null>;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare entity_id: CreationOptional<string | null>;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    declare createdAt: CreationOptional<Date>;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    declare updatedAt: CreationOptional<Date>;
}
