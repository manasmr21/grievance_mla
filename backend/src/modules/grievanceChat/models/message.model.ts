import { InferAttributes, InferCreationAttributes } from "sequelize";
import type { CreationOptional, NonAttribute } from "sequelize";
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { GrievanceChat } from "./chat.model";
import { UserAccount } from "src/modules/userAccount/models/user.model";

@Table({
    tableName: "grievance_messages",
    timestamps: true
})

export class GrievanceMessages extends Model<
    InferAttributes<GrievanceMessages>,
    InferCreationAttributes<GrievanceMessages>
> {

    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true
    })
    declare id: CreationOptional<string>;

    @ForeignKey(() => GrievanceChat)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare chat_id: string

    @BelongsTo(() => GrievanceChat, { foreignKey: 'chat_id', onDelete: 'CASCADE' })
    declare chat: NonAttribute<GrievanceChat>;

    @ForeignKey(() => UserAccount)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare sender_id: number;

    @BelongsTo(() => UserAccount, "sender_id")
    declare sender: NonAttribute<UserAccount>;

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    declare message: string

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false
    })
    declare is_read: CreationOptional<boolean>

    @Column({
        type: DataType.DATE,
        defaultValue: DataType.NOW
    })
    declare createdAt: CreationOptional<Date>

    @Column({
        type: DataType.DATE,
        defaultValue: DataType.NOW
    })
    declare updatedAt: CreationOptional<Date>

}