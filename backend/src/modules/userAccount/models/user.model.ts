import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional, NonAttribute } from 'sequelize';
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { Role } from '../../roles/models/roles.model';

@Table({
    tableName: 'user_account',
    timestamps: true,
})
export class UserAccount extends Model<
    InferAttributes<UserAccount>,
    InferCreationAttributes<UserAccount>
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
        unique: true,
    })
    declare email: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare password: string;

    @ForeignKey(() => Role)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare role_id: number;

    @BelongsTo(() => Role)
    declare role: NonAttribute<Role>;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: 'active',
    })
    declare account_status: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare dashboard_route: CreationOptional<string>;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare reset_password_token: CreationOptional<string | null>;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare reset_password_expires: CreationOptional<Date | null>;

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
