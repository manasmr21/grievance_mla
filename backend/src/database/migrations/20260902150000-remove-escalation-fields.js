'use strict';

const GRIEVANCE_COLUMNS = [
  'current_escalation_level',
];

const EXECUTION_COLUMNS = [
  'escalation_level',
  'escalated_from_role',
  'escalated_to_role',
  'is_resolved',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const grievanceTable = await queryInterface.describeTable('grievance_details');
    for (const column of GRIEVANCE_COLUMNS) {
      if (grievanceTable[column]) {
        await queryInterface.removeColumn('grievance_details', column);
      }
    }

    const executionTable = await queryInterface.describeTable('grievance_execution');
    for (const column of EXECUTION_COLUMNS) {
      if (executionTable[column]) {
        await queryInterface.removeColumn('grievance_execution', column);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const grievanceTable = await queryInterface.describeTable('grievance_details');
    if (!grievanceTable.current_escalation_level) {
      await queryInterface.addColumn('grievance_details', 'current_escalation_level', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      });
    }

    const executionTable = await queryInterface.describeTable('grievance_execution');
    if (!executionTable.escalation_level) {
      await queryInterface.addColumn('grievance_execution', 'escalation_level', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    if (!executionTable.escalated_from_role) {
      await queryInterface.addColumn('grievance_execution', 'escalated_from_role', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }
    if (!executionTable.escalated_to_role) {
      await queryInterface.addColumn('grievance_execution', 'escalated_to_role', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }
    if (!executionTable.is_resolved) {
      await queryInterface.addColumn('grievance_execution', 'is_resolved', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      });
    }
  },
};
