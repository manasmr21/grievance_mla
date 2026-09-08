'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Update menu paths and dashboard routes: /hod/ -> /staff/
      await queryInterface.sequelize.query(
        `UPDATE menu_items SET path = REPLACE(path, '/hod/', '/staff/') WHERE path LIKE '/hod/%'`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `UPDATE user_account SET dashboard_route = REPLACE(dashboard_route, '/hod/', '/staff/') WHERE dashboard_route LIKE '/hod/%'`,
        { transaction },
      );

      // Grievance path tables
      await queryInterface.createTable(
        'grievance_path',
        {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
          name: { type: Sequelize.STRING(255), allowNull: false },
          type_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'types', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          category_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'grievance_category', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          sub_category_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'grievance_sub_category', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          priority_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'ticket_priority', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        },
        { transaction },
      );

      await queryInterface.createTable(
        'grievance_path_node',
        {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
          path_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'grievance_path', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          sequence: { type: Sequelize.INTEGER, allowNull: false },
          name: { type: Sequelize.STRING(255), allowNull: false },
          description: { type: Sequelize.TEXT, allowNull: true },
          is_terminal: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        },
        { transaction },
      );

      await queryInterface.addIndex('grievance_path_node', ['path_id', 'sequence'], {
        unique: true,
        name: 'grievance_path_node_path_sequence_unique',
        transaction,
      });

      await queryInterface.createTable(
        'grievance_path_node_roles',
        {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
          node_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'grievance_path_node', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          role_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'roles', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
          createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        },
        { transaction },
      );

      await queryInterface.addIndex('grievance_path_node_roles', ['node_id', 'role_id'], {
        unique: true,
        name: 'grievance_path_node_roles_node_role_unique',
        transaction,
      });

      await queryInterface.addColumn(
        'grievance_details',
        'path_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'grievance_path', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'grievance_details',
        'current_node_sequence',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        { transaction },
      );

      // Drop assignment_rule (replaced by grievance_path)
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS assignment_rule CASCADE', { transaction });

      // Remove student tables and columns
      await queryInterface.removeColumn('grievance_details', 'student_id', { transaction }).catch(() => {});
      await queryInterface.removeColumn('grievance_details', 'department', { transaction }).catch(() => {});
      await queryInterface.removeColumn('grievance_details', 'class_of', { transaction }).catch(() => {});

      await queryInterface.sequelize.query('DROP TABLE IF EXISTS student_registration_requests CASCADE', { transaction });
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS student_details CASCADE', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('grievance_details', 'current_node_sequence', { transaction }).catch(() => {});
      await queryInterface.removeColumn('grievance_details', 'path_id', { transaction }).catch(() => {});
      await queryInterface.dropTable('grievance_path_node_roles', { transaction });
      await queryInterface.dropTable('grievance_path_node', { transaction });
      await queryInterface.dropTable('grievance_path', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
