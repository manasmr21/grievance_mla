import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional, NonAttribute } from 'sequelize';
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UiTable } from './ui-table.model';
import { Role } from '../../roles/models/roles.model';

@Table({
  tableName: 'ui_table_columns',
  timestamps: true,
})
export class UiTableColumn extends Model<
  InferAttributes<UiTableColumn>,
  InferCreationAttributes<UiTableColumn>
> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: CreationOptional<number>;

  @ForeignKey(() => UiTable)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare table_id: number;

  @BelongsTo(() => UiTable, { foreignKey: 'table_id' })
  declare table: NonAttribute<UiTable>;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare code: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare field_kind: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare data_type: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare reference_table: CreationOptional<string | null>;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare db_column_name: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  declare is_system: CreationOptional<boolean>;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare is_active: CreationOptional<boolean>;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  declare display_order: CreationOptional<number>;

  @ForeignKey(() => Role)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare role_id: CreationOptional<number | null>;

  @BelongsTo(() => Role, { foreignKey: 'role_id', constraints: true })
  declare role: NonAttribute<Role>;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  declare ui_config: CreationOptional<Record<string, unknown> | null>;

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
