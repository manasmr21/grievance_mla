import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional } from 'sequelize';
import { Model, Table, Column, DataType } from "sequelize-typescript";

@Table({
    tableName: 'audit_logs',
    timestamps: true,
})

export class AuditLog extends Model<
    InferAttributes<AuditLog>,
    InferCreationAttributes<AuditLog>
> {
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    })
    declare id: CreationOptional<number>;
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare actor_id: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare action: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare entity_type: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare entity_id: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare metadata: CreationOptional<string>;

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
