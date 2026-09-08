import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional } from 'sequelize';
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
    tableName: 'ticket_status',
    timestamps: true,
})
export class TicketStatus extends Model<
    InferAttributes<TicketStatus>,
    InferCreationAttributes<TicketStatus>
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
            name: 'ticket_status_code_unique',
            msg: 'This status already exists',
        },
    })
    declare code: string;

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
