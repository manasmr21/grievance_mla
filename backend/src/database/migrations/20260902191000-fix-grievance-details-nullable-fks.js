'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE grievance_details ALTER COLUMN student_id DROP NOT NULL;',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE grievance_details ALTER COLUMN sub_category_id DROP NOT NULL;',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE grievance_details ALTER COLUMN sub_category_id SET NOT NULL;',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE grievance_details ALTER COLUMN student_id SET NOT NULL;',
    );
  },
};
