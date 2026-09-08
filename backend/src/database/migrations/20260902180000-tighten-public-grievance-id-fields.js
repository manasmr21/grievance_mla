'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('public_grievance_submissions', 'mobile_number', {
      type: Sequelize.STRING(10),
      allowNull: false,
    });
    await queryInterface.changeColumn('public_grievance_submissions', 'aadhaar_or_voter_id', {
      type: Sequelize.STRING(12),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('public_grievance_submissions', 'mobile_number', {
      type: Sequelize.STRING(15),
      allowNull: false,
    });
    await queryInterface.changeColumn('public_grievance_submissions', 'aadhaar_or_voter_id', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },
};
