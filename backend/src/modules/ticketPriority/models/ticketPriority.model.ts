import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional } from 'sequelize';
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
    tableName: 'ticket_priority',
    timestamps: true,
    indexes: [
        {
            name: 'idx_priority_code_active',
            fields: ['code', 'is_active'],
        },
    ],
})
export class TicketPriority extends Model<
    InferAttributes<TicketPriority>,
    InferCreationAttributes<TicketPriority>
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
        unique: {
            name: 'ticket_priority_code_unique',
            msg: 'This priority already exists',
        },
    })
    declare code: string;

    @Column({
        type: DataType.FLOAT,
        allowNull: true,
    })
    declare resolution_hours: CreationOptional<number | null>;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    declare is_active: CreationOptional<boolean>;

    @Column({
        type: DataType.DATE,
        defaultValue: DataType.NOW,
    })
    declare createdAt: CreationOptional<Date>;

    @Column({
        type: DataType.DATE,
        defaultValue: DataType.NOW,
    })
    declare updatedAt: CreationOptional<Date>;
}
