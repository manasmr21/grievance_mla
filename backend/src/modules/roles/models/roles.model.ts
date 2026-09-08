import {  InferAttributes, InferCreationAttributes } from 'sequelize';
import type { CreationOptional } from 'sequelize';
import {
  Table,
  Column,
  Model,
  DataType,
} from 'sequelize-typescript';

@Table({
  tableName: 'roles',
  timestamps: true,
})

export class Role extends Model<
InferAttributes<Role>,
InferCreationAttributes<Role>
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
      name: 'roles_code_unique',
      msg: 'This role already exists',
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
  })
  declare createdAt: CreationOptional<Date>;

  @Column({
    type: DataType.DATE,
  })
  declare updatedAt: CreationOptional<Date>;
}
