'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'ALTER TABLE grievance_details ALTER COLUMN student_id DROP NOT NULL;',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE grievance_details ALTER COLUMN sub_category_id DROP NOT NULL;',
    );

    const tableDesc = await queryInterface.describeTable('grievance_details');

    if (!tableDesc.source) {
      await queryInterface.addColumn('grievance_details', 'source', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'student',
      });
    }

    if (!tableDesc.full_name) {
      await queryInterface.addColumn('grievance_details', 'full_name', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }

    if (!tableDesc.mobile_number) {
      await queryInterface.addColumn('grievance_details', 'mobile_number', {
        type: Sequelize.STRING(10),
        allowNull: true,
      });
    }

    if (!tableDesc.aadhaar_or_voter_id) {
      await queryInterface.addColumn('grievance_details', 'aadhaar_or_voter_id', {
        type: Sequelize.STRING(12),
        allowNull: true,
      });
    }

    if (!tableDesc.permanent_address) {
      await queryInterface.addColumn('grievance_details', 'permanent_address', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!tableDesc.state_id) {
      await queryInterface.addColumn('grievance_details', 'state_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'states', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    if (!tableDesc.district_id) {
      await queryInterface.addColumn('grievance_details', 'district_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'districts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    if (!tableDesc.block_id) {
      await queryInterface.addColumn('grievance_details', 'block_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'blocks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    if (!tableDesc.gram_panchayat_ward_id) {
      await queryInterface.addColumn('grievance_details', 'gram_panchayat_ward_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'gram_panchayat_wards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    if (!tableDesc.village_id) {
      await queryInterface.addColumn('grievance_details', 'village_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'villages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    if (!tableDesc.location_description) {
      await queryInterface.addColumn('grievance_details', 'location_description', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!tableDesc.gps_latitude) {
      await queryInterface.addColumn('grievance_details', 'gps_latitude', {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
      });
    }

    if (!tableDesc.gps_longitude) {
      await queryInterface.addColumn('grievance_details', 'gps_longitude', {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
      });
    }

    if (!tableDesc.declaration_accepted) {
      await queryInterface.addColumn('grievance_details', 'declaration_accepted', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      });
    }

    const tableExists = await queryInterface.sequelize.query(
      `SELECT to_regclass('public.public_grievance_submissions') AS name;`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    if (tableExists[0]?.name) {
      await queryInterface.dropTable('public_grievance_submissions');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('grievance_details', 'declaration_accepted');
    await queryInterface.removeColumn('grievance_details', 'gps_longitude');
    await queryInterface.removeColumn('grievance_details', 'gps_latitude');
    await queryInterface.removeColumn('grievance_details', 'location_description');
    await queryInterface.removeColumn('grievance_details', 'village_id');
    await queryInterface.removeColumn('grievance_details', 'gram_panchayat_ward_id');
    await queryInterface.removeColumn('grievance_details', 'block_id');
    await queryInterface.removeColumn('grievance_details', 'district_id');
    await queryInterface.removeColumn('grievance_details', 'state_id');
    await queryInterface.removeColumn('grievance_details', 'permanent_address');
    await queryInterface.removeColumn('grievance_details', 'aadhaar_or_voter_id');
    await queryInterface.removeColumn('grievance_details', 'mobile_number');
    await queryInterface.removeColumn('grievance_details', 'full_name');
    await queryInterface.removeColumn('grievance_details', 'source');

    await queryInterface.sequelize.query(
      'ALTER TABLE grievance_details ALTER COLUMN sub_category_id SET NOT NULL;',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE grievance_details ALTER COLUMN student_id SET NOT NULL;',
    );
  },
};
