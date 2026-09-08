import { InferAttributes, InferCreationAttributes } from "sequelize";
import type { CreationOptional, NonAttribute } from "sequelize";
import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Grievance } from "src/modules/grievances/models/grievance.model";
import { Role } from "src/modules/roles/models/roles.model";
import { UserAccount } from "src/modules/userAccount/models/user.model";
import { GrievanceMessages } from "./message.model";

@Table({
    tableName: "grievance_chats",
    timestamps: true,
})
export class GrievanceChat extends Model<
    InferAttributes<GrievanceChat>,
    InferCreationAttributes<GrievanceChat>
> {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: CreationOptional<string>;

    @ForeignKey(() => Grievance)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare grievance_id: string;

    @BelongsTo(() => Grievance, { onDelete: 'CASCADE' })
    declare grievance: NonAttribute<Grievance>;

    @ForeignKey(() => UserAccount)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare user1_id: number;

    @BelongsTo(() => UserAccount, "user1_id")
    declare user1: NonAttribute<UserAccount>;

    @ForeignKey(() => Role)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare user1_role_id: number;

    @BelongsTo(() => Role, "user1_role_id")
    declare user1_role: NonAttribute<Role>;

    @Column({
        type: DataType.JSONB,
        allowNull: false,
        defaultValue: []
    })
    declare user2_ids: number[];

    @Column({
        type: DataType.JSONB,
        allowNull: false,
        defaultValue: []
    })
    declare user2_role_ids: number[];

    @HasMany(() => GrievanceMessages)
    declare messages: NonAttribute<GrievanceMessages[]>;

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