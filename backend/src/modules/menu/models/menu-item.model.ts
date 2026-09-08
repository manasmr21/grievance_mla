import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional } from 'sequelize';
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { Role } from '../../roles/models/roles.model';
import { RoleMenuItem } from './role-menu-item.model';

@Table({
  tableName: 'menu_items',
  timestamps: true,
})
export class MenuItem extends Model<
  InferAttributes<MenuItem>,
  InferCreationAttributes<MenuItem>
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
    unique: true,
  })
  declare code: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare label: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare path: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'fa-solid fa-circle',
  })
  declare icon: CreationOptional<string>;

  @ForeignKey(() => MenuItem)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare parent_id: number | null;

  @BelongsTo(() => MenuItem, 'parent_id')
  declare parent?: MenuItem;

  @HasMany(() => MenuItem, 'parent_id')
  declare children?: MenuItem[];

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare sort_order: CreationOptional<number>;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  declare is_active: CreationOptional<boolean>;

  @Column({ type: DataType.DATE })
  declare createdAt: CreationOptional<Date>;

  @Column({ type: DataType.DATE })
  declare updatedAt: CreationOptional<Date>;

  @BelongsToMany(() => Role, () => RoleMenuItem)
  declare roles?: Role[];

  @HasMany(() => RoleMenuItem)
  declare roleMenuItems?: RoleMenuItem[];
}
