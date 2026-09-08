'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('states', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      external_id: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.createTable('districts', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      external_id: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      state_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'states', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('districts', ['state_id'], { name: 'idx_districts_state_id' });

    await queryInterface.createTable('blocks', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      external_id: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      district_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'districts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('blocks', ['district_id'], { name: 'idx_blocks_district_id' });

    await queryInterface.createTable('gram_panchayat_wards', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      external_id: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      block_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'blocks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      type: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('gram_panchayat_wards', ['block_id'], {
      name: 'idx_gram_panchayat_wards_block_id',
    });

    await queryInterface.createTable('villages', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      external_id: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      block_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'blocks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      gram_panchayat_ward_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'gram_panchayat_wards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('villages', ['block_id'], { name: 'idx_villages_block_id' });
    await queryInterface.addIndex('villages', ['gram_panchayat_ward_id'], {
      name: 'idx_villages_gram_panchayat_ward_id',
    });

    await queryInterface.createTable('public_grievance_submissions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      public_ticket_no: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      full_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      mobile_number: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      aadhaar_or_voter_id: {
        type: Sequelize.STRING(12),
        allowNull: true,
      },
      permanent_address: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      state_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'states', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      district_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'districts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      block_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'blocks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      gram_panchayat_ward_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'gram_panchayat_wards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      village_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'villages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      location_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      gps_latitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
      },
      gps_longitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'grievance_category', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      subject: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      attachment_url: {
        type: Sequelize.STRING(1000),
        allowNull: true,
      },
      declaration_accepted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'SUBMITTED',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('public_grievance_submissions');
    await queryInterface.dropTable('villages');
    await queryInterface.dropTable('gram_panchayat_wards');
    await queryInterface.dropTable('blocks');
    await queryInterface.dropTable('districts');
    await queryInterface.dropTable('states');
  },
};
