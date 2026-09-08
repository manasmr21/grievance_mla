'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dropFkIfExists = async (column) => {
      try {
        await queryInterface.removeConstraint('grievance_details', `grievance_details_${column}_fkey`);
      } catch (_) {
        // constraint name may differ — ignore
      }
    };

    for (const col of ['state_id', 'district_id', 'block_id', 'gram_panchayat_ward_id', 'village_id']) {
      await dropFkIfExists(col);
    }

    for (const col of ['state_id', 'district_id', 'block_id', 'gram_panchayat_ward_id', 'village_id']) {
      const desc = await queryInterface.describeTable('grievance_details');
      if (desc[col]) {
        await queryInterface.removeColumn('grievance_details', col);
      }
    }

    const desc = await queryInterface.describeTable('grievance_details');

    const addCol = async (name, definition) => {
      if (!desc[name]) {
        await queryInterface.addColumn('grievance_details', name, definition);
      }
    };

    await addCol('jurisdiction_type', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
    await addCol('location_state_id', { type: Sequelize.STRING(20), allowNull: true });
    await addCol('location_district_id', { type: Sequelize.STRING(20), allowNull: true });
    await addCol('location_area_id', { type: Sequelize.STRING(30), allowNull: true });
    await addCol('location_sub_area_id', { type: Sequelize.STRING(30), allowNull: true });
    await addCol('location_settlement_id', { type: Sequelize.STRING(30), allowNull: true });
    await addCol('location_state_name', { type: Sequelize.STRING(255), allowNull: true });
    await addCol('location_district_name', { type: Sequelize.STRING(255), allowNull: true });
    await addCol('location_area_name', { type: Sequelize.STRING(255), allowNull: true });
    await addCol('location_sub_area_name', { type: Sequelize.STRING(255), allowNull: true });
    await addCol('location_settlement_name', { type: Sequelize.STRING(255), allowNull: true });

    await queryInterface.dropTable('villages').catch(() => {});
    await queryInterface.dropTable('gram_panchayat_wards').catch(() => {});
    await queryInterface.dropTable('blocks').catch(() => {});
    await queryInterface.dropTable('districts').catch(() => {});
    await queryInterface.dropTable('states').catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('states', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      external_id: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    const removeCols = [
      'jurisdiction_type',
      'location_state_id',
      'location_district_id',
      'location_area_id',
      'location_sub_area_id',
      'location_settlement_id',
      'location_state_name',
      'location_district_name',
      'location_area_name',
      'location_sub_area_name',
      'location_settlement_name',
    ];
    for (const col of removeCols) {
      const desc = await queryInterface.describeTable('grievance_details');
      if (desc[col]) await queryInterface.removeColumn('grievance_details', col);
    }
  },
};
