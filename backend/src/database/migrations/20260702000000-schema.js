'use strict';

/**
 * Consolidated schema migration — final Grievance Management database state.
 * Idempotent: drops existing objects before recreating (safe partial re-run).
 *
 * Excludes removed features: hostel, mail campaigns, assignment_logic/scope.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // ──────────────────────────────────────────────
      // CLEANUP: Drop all tables/constraints/indexes if they exist
      // (reverse dependency order) so the migration is idempotent.
      // ──────────────────────────────────────────────
      const tablesToDrop = [
        'role_menu_items',
        'menu_items',
        'ui_table_columns',
        'ui_tables',
        'student_registration_requests',
        'notifications',
        'audit_logs',
        'assignment_rule',
        'grievance_messages',
        'grievance_chats',
        'grievance_execution',
        'grievance_details',
        'grievance_sub_category',
        'grievance_category',
        'user_account',
        'student_details',
        'departments',
        'employee_details',
        'types',
        'ticket_priority',
        'ticket_status',
        'roles',
      ];

      for (const table of tablesToDrop) {
        await queryInterface.sequelize.query(
          `DROP TABLE IF EXISTS "${table}" CASCADE`,
          { transaction },
        );
      }

      // Also drop the index if it exists
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "idx_priority_code_active"`,
        { transaction },
      );

      // ──────────────────────────────────────────────
      // 1. roles
      // ──────────────────────────────────────────────
      await queryInterface.createTable('roles', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 2. ticket_status
      // ──────────────────────────────────────────────
      await queryInterface.createTable('ticket_status', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 4. ticket_priority
      // ──────────────────────────────────────────────
      await queryInterface.createTable('ticket_priority', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        resolution_hours: {
          type: Sequelize.FLOAT,
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
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
      }, { transaction });

      // Composite index on ticket_priority
      await queryInterface.addIndex('ticket_priority', ['code', 'is_active'], {
        name: 'idx_priority_code_active',
        transaction,
      });

      // ──────────────────────────────────────────────
      // 5. types (grievance types)
      // ──────────────────────────────────────────────
      await queryInterface.createTable('types', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 6. employee_details
      // ──────────────────────────────────────────────
      await queryInterface.createTable('employee_details', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        role_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'roles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        department_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          // FK to departments added later via addConstraint (circular dep)
        },
        email: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        mobile_number: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 7. departments
      // ──────────────────────────────────────────────
      await queryInterface.createTable('departments', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 8. hostel
      // ──────────────────────────────────────────────
      
      // ──────────────────────────────────────────────
      // Now add deferred FKs on employee_details → departments, hostel, hostel_block
      // ──────────────────────────────────────────────
      await queryInterface.addConstraint('employee_details', {
        fields: ['department_id'],
        type: 'foreign key',
        name: 'fk_employee_department',
        references: { table: 'departments', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        transaction,
      });// ──────────────────────────────────────────────
      // 11. student_details
      // ──────────────────────────────────────────────
      await queryInterface.createTable('student_details', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        adhaar_number: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true,
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        department_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'departments', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        gender: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        phone_number: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
        verification_otp: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        is_verified: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 12. user_account
      // ──────────────────────────────────────────────
      await queryInterface.createTable('user_account', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        password: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        role_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'roles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        account_status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'active',
        },
        dashboard_route: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        reset_password_token: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        reset_password_expires: {
          type: Sequelize.DATE,
          allowNull: true,
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 13. grievance_category
      // ──────────────────────────────────────────────
      await queryInterface.createTable('grievance_category', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        type_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'types', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        is_active: {
          type: Sequelize.BOOLEAN,
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 14. grievance_sub_category
      // ──────────────────────────────────────────────
      await queryInterface.createTable('grievance_sub_category', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        category_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'grievance_category', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        is_active: {
          type: Sequelize.BOOLEAN,
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 15. grievance_details
      // ──────────────────────────────────────────────
      await queryInterface.createTable('grievance_details', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        public_ticket_no: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        student_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'student_details', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        category_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'grievance_category', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        sub_category_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'grievance_sub_category', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        subject: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        status_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'ticket_status', key: 'id' },
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
        current_assigned_employee_id: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
        },
        department: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        class_of: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        first_response_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        resolved_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        sla_due_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        image_url: {
          type: Sequelize.STRING(1000),
          allowNull: true,
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 16. grievance_execution
      // ──────────────────────────────────────────────
      await queryInterface.createTable('grievance_execution', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        grievance_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'grievance_details', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        from_id: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        to_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'employee_details', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        remarks: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        attachment: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        action_type: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'ASSIGNMENT',
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 17. grievance_chats
      // ──────────────────────────────────────────────
      await queryInterface.createTable('grievance_chats', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        grievance_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'grievance_details', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        user1_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'user_account', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        user1_role_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'roles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        user2_ids: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        user2_role_ids: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 18. grievance_messages
      // ──────────────────────────────────────────────
      await queryInterface.createTable('grievance_messages', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        chat_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'grievance_chats', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        sender_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'user_account', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        is_read: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 19. assignment_rule
      // ──────────────────────────────────────────────
      await queryInterface.createTable('assignment_rule', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
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
          onDelete: 'CASCADE',
        },
        sub_category_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'grievance_sub_category', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        priority_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'ticket_priority', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        role_ids: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        is_active: {
          type: Sequelize.BOOLEAN,
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 20. audit_logs
      // ──────────────────────────────────────────────
      await queryInterface.createTable('audit_logs', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        actor_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        action: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        entity_type: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        entity_id: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        metadata: {
          type: Sequelize.TEXT,
          allowNull: true,
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
      }, { transaction });

      // ──────────────────────────────────────────────
      // 22. notifications
      // ──────────────────────────────────────────────
      await queryInterface.createTable('notifications', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'user_account', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        type: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        is_read: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        entity_type: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        entity_id: {
          type: Sequelize.STRING,
          allowNull: true,
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
      }, { transaction });


      // student_registration_requests
      await queryInterface.createTable('student_registration_requests', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        adhaar_number: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        phone_number: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        gender: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        department_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'departments', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'pending',
        },
        reviewed_by: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'employee_details', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        reviewed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        rejection_reason: {
          type: Sequelize.TEXT,
          allowNull: true,
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
      }, { transaction });

      await queryInterface.addIndex('student_registration_requests', ['email'], {
        name: 'student_registration_requests_email_idx',
        transaction,
      });
      await queryInterface.addIndex('student_registration_requests', ['adhaar_number'], {
        name: 'student_registration_requests_adhaar_idx',
        transaction,
      });
      await queryInterface.addIndex('student_registration_requests', ['status'], {
        name: 'student_registration_requests_status_idx',
        transaction,
      });
      await queryInterface.addIndex('student_registration_requests', ['department_id'], {
        name: 'student_registration_requests_department_idx',
        transaction,
      });

      // ui_tables + ui_table_columns
      await queryInterface.createTable(
        'ui_tables',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          code: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
          },
          physical_table_name: {
            type: Sequelize.STRING,
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
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await queryInterface.createTable(
        'ui_table_columns',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          table_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'ui_tables', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          code: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          field_kind: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          data_type: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          reference_table: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          db_column_name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          is_system: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          display_order: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          ui_config: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await queryInterface.addIndex(
        'ui_table_columns',
        ['table_id', 'code'],
        { unique: true, name: 'ui_table_columns_table_id_code_unique', transaction },
      );

      await queryInterface.addIndex(
        'ui_table_columns',
        ['table_id', 'db_column_name'],
        { unique: true, name: 'ui_table_columns_table_id_db_column_name_unique', transaction },
      );

      const now = new Date();
      await queryInterface.bulkInsert(
        'ui_tables',
        [
          {
            name: 'Department',
            code: 'department',
            physical_table_name: 'departments',
            is_active: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
        { transaction },
      );

      const [tables] = await queryInterface.sequelize.query(
        `SELECT id FROM ui_tables WHERE code = 'department' LIMIT 1`,
        { transaction },
      );
      const departmentTableId = tables[0].id;

      await queryInterface.bulkInsert(
        'ui_table_columns',
        [
          {
            table_id: departmentTableId,
            name: 'Name',
            code: 'name',
            field_kind: 'text',
            data_type: 'varchar',
            reference_table: null,
            db_column_name: 'name',
            is_system: true,
            is_active: true,
            display_order: 1,
            ui_config: null,
            createdAt: now,
            updatedAt: now,
          },
          {
            table_id: departmentTableId,
            name: 'Code',
            code: 'code',
            field_kind: 'text',
            data_type: 'varchar',
            reference_table: null,
            db_column_name: 'code',
            is_system: true,
            is_active: true,
            display_order: 2,
            ui_config: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
        { transaction },
      );

      // menu_items + role_menu_items
      await queryInterface.createTable(
        'menu_items',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          code: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
          },
          label: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          path: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          icon: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'fa-solid fa-circle',
          },
          parent_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'menu_items', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          sort_order: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await queryInterface.createTable(
        'role_menu_items',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          role_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'roles', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          menu_item_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'menu_items', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          sort_order: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await queryInterface.addIndex(
        'role_menu_items',
        ['role_id', 'menu_item_id'],
        {
          unique: true,
          name: 'role_menu_items_role_menu_unique',
          transaction,
        },
      );


      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tablesToDrop = [
        'role_menu_items',
        'menu_items',
        'ui_table_columns',
        'ui_tables',
        'student_registration_requests',
        'notifications',
        'audit_logs',
        'assignment_rule',
        'grievance_messages',
        'grievance_chats',
        'grievance_execution',
        'grievance_details',
        'grievance_sub_category',
        'grievance_category',
        'user_account',
        'student_details',
        'departments',
        'employee_details',
        'types',
        'ticket_priority',
        'ticket_status',
        'roles',
      ];

      for (const table of tablesToDrop) {
        await queryInterface.sequelize.query(
          `DROP TABLE IF EXISTS "${table}" CASCADE`,
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "idx_priority_code_active"`,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
