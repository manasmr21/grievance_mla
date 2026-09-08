import { InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional, NonAttribute } from 'sequelize';
import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { UiTableColumn } from './ui-table-column.model';

@Table({
  tableName: 'ui_tables',
  timestamps: true,
})
export class UiTable extends Model<
  InferAttributes<UiTable>,
  InferCreationAttributes<UiTable>
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
  declare code: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare physical_table_name: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare is_active: CreationOptional<boolean>;

  @HasMany(() => UiTableColumn, { foreignKey: 'table_id' })
  declare columns: NonAttribute<UiTableColumn[]>;

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
