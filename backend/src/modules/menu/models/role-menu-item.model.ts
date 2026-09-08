import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional } from 'sequelize';
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Role } from '../../roles/models/roles.model';
import { MenuItem } from './menu-item.model';

@Table({
  tableName: 'role_menu_items',
  timestamps: true,
})
export class RoleMenuItem extends Model<
  InferAttributes<RoleMenuItem>,
  InferCreationAttributes<RoleMenuItem>
> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: CreationOptional<number>;

  @ForeignKey(() => Role)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare role_id: number;

  @BelongsTo(() => Role)
  declare role?: Role;

  @ForeignKey(() => MenuItem)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare menu_item_id: number;

  @BelongsTo(() => MenuItem)
  declare menuItem?: MenuItem;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare sort_order: number | null;

  @Column({ type: DataType.DATE })
  declare createdAt: CreationOptional<Date>;

  @Column({ type: DataType.DATE })
  declare updatedAt: CreationOptional<Date>;
}
