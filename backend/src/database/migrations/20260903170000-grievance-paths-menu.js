'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();

      // Rename legacy Assignment Rules menu → Grievance Paths (same slot in Master Data)
      await queryInterface.sequelize.query(
        `
        UPDATE menu_items
        SET
          code = 'admin.grievance_paths',
          label = 'Grievance Paths',
          path = '/admin/grievance-paths',
          icon = 'fa-solid fa-route',
          is_active = TRUE,
          "updatedAt" = :now
        WHERE code IN ('admin.assignment_rules', 'admin.assignment_rule')
           OR path = '/admin/assignment-rules'
           OR id = 117
        `,
        { transaction, replacements: { now } },
      );

      const [[existing]] = await queryInterface.sequelize.query(
        `SELECT id FROM menu_items WHERE code = 'admin.grievance_paths' LIMIT 1`,
        { transaction },
      );

      let menuItemId = existing?.id;

      if (!menuItemId) {
        const [[masterData]] = await queryInterface.sequelize.query(
          `SELECT id FROM menu_items WHERE code = 'admin.group.master_data' LIMIT 1`,
          { transaction },
        );
        const parentId = masterData?.id ?? 110;

        await queryInterface.bulkInsert(
          'menu_items',
          [
            {
              id: 117,
              code: 'admin.grievance_paths',
              label: 'Grievance Paths',
              path: '/admin/grievance-paths',
              icon: 'fa-solid fa-route',
              parent_id: parentId,
              sort_order: 6,
              is_active: true,
              createdAt: now,
              updatedAt: now,
            },
          ],
          { transaction },
        );
        menuItemId = 117;
      }

      // Deactivate any leftover assignment-rules menu duplicates
      await queryInterface.sequelize.query(
        `
        UPDATE menu_items
        SET is_active = FALSE, "updatedAt" = :now
        WHERE (code IN ('admin.assignment_rules', 'admin.assignment_rule') OR path = '/admin/assignment-rules')
          AND id <> :menuItemId
        `,
        { transaction, replacements: { now, menuItemId } },
      );

      const [[adminRole]] = await queryInterface.sequelize.query(
        `SELECT id FROM roles WHERE UPPER(code) = 'ADMIN' LIMIT 1`,
        { transaction },
      );

      if (adminRole?.id) {
        await queryInterface.sequelize.query(
          `
          INSERT INTO role_menu_items (role_id, menu_item_id, sort_order, "createdAt", "updatedAt")
          SELECT :roleId, :menuItemId, 12, :now, :now
          WHERE NOT EXISTS (
            SELECT 1 FROM role_menu_items
            WHERE role_id = :roleId AND menu_item_id = :menuItemId
          )
          `,
          {
            transaction,
            replacements: { roleId: adminRole.id, menuItemId, now },
          },
        );
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();
      await queryInterface.sequelize.query(
        `
        UPDATE menu_items
        SET
          code = 'admin.assignment_rules',
          label = 'Assignment Rules',
          path = '/admin/assignment-rules',
          icon = 'fa-solid fa-diagram-project',
          "updatedAt" = :now
        WHERE code = 'admin.grievance_paths'
        `,
        { transaction, replacements: { now } },
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
