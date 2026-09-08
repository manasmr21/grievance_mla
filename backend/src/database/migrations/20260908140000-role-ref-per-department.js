'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [columns] = await queryInterface.sequelize.query(
      `SELECT utc.db_column_name, ut.physical_table_name
       FROM ui_table_columns utc
       JOIN ui_tables ut ON ut.id = utc.table_id
       WHERE utc.field_kind = 'role_ref'
         AND utc.is_active = true
         AND ut.code = 'department'`,
    );

    for (const col of columns) {
      const tableName = col.physical_table_name;
      const columnName = col.db_column_name;
      const table = await queryInterface.describeTable(tableName);

      if (!table[columnName]) {
        await queryInterface.addColumn(tableName, columnName, {
          type: 'INTEGER',
          allowNull: true,
          references: { model: 'roles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
      }
    }

    await queryInterface.sequelize.query(
      `UPDATE ui_table_columns SET role_id = NULL WHERE field_kind = 'role_ref'`,
    );
  },

  async down() {
    // No-op: physical columns are managed by table-schema delete flow.
  },
};
