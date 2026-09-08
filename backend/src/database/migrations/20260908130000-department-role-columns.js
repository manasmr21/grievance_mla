'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const uiColumnsTable = await queryInterface.describeTable('ui_table_columns');
      if (!uiColumnsTable.role_id) {
        await queryInterface.addColumn(
          'ui_table_columns',
          'role_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'roles', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          { transaction },
        );
      }

      const [deptTables] = await queryInterface.sequelize.query(
        `SELECT id FROM ui_tables WHERE code = 'department' LIMIT 1`,
        { transaction },
      );
      const departmentTableId = deptTables[0]?.id;

      if (departmentTableId) {
        const [customCols] = await queryInterface.sequelize.query(
          `SELECT id, db_column_name, field_kind
           FROM ui_table_columns
           WHERE table_id = :tableId
             AND is_system = false
             AND is_active = true
             AND field_kind IN ('text', 'employee_ref')`,
          { replacements: { tableId: departmentTableId }, transaction },
        );

        for (const col of customCols) {
          const dbColumnName = col.db_column_name;
          const fieldKind = col.field_kind;

          if (fieldKind === 'employee_ref') {
            const constraintName = `departments_${dbColumnName}_fkey`.slice(0, 63);
            await queryInterface.sequelize.query(
              `ALTER TABLE departments DROP CONSTRAINT IF EXISTS "${constraintName}"`,
              { transaction },
            );
          }

          const deptTable = await queryInterface.describeTable('departments');
          if (deptTable[dbColumnName]) {
            await queryInterface.removeColumn('departments', dbColumnName, { transaction });
          }

          await queryInterface.sequelize.query(
            `DELETE FROM ui_table_columns WHERE id = :id`,
            { replacements: { id: col.id }, transaction },
          );
        }

        await queryInterface.sequelize.query(
          `DELETE FROM ui_table_columns
           WHERE table_id = :tableId
             AND code IN ('default_hod_employee_id', 'is_active')`,
          { replacements: { tableId: departmentTableId }, transaction },
        );
      }

      const departmentsTable = await queryInterface.describeTable('departments');

      if (departmentsTable.default_hod_employee_id) {
        await queryInterface.sequelize.query(
          `ALTER TABLE departments DROP CONSTRAINT IF EXISTS "departments_default_hod_employee_id_fkey"`,
          { transaction },
        );
        await queryInterface.removeColumn('departments', 'default_hod_employee_id', { transaction });
      }

      if (departmentsTable.default_coordinator_employee_id) {
        await queryInterface.sequelize.query(
          `ALTER TABLE departments DROP CONSTRAINT IF EXISTS "departments_default_coordinator_employee_id_fkey"`,
          { transaction },
        );
        await queryInterface.removeColumn('departments', 'default_coordinator_employee_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const departmentsTable = await queryInterface.describeTable('departments');

      if (!departmentsTable.default_hod_employee_id) {
        await queryInterface.addColumn(
          'departments',
          'default_hod_employee_id',
          {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'employee_details', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      if (!departmentsTable.default_coordinator_employee_id) {
        await queryInterface.addColumn(
          'departments',
          'default_coordinator_employee_id',
          {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'employee_details', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      const uiColumnsTable = await queryInterface.describeTable('ui_table_columns');
      if (uiColumnsTable.role_id) {
        await queryInterface.removeColumn('ui_table_columns', 'role_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
