'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const staffMenus = [
      { id: 201, code: 'staff.dashboard', label: 'Dashboard', path: '/dashboard', icon: 'fa-solid fa-house', parent_id: null, sort_order: 1 },
      { id: 202, code: 'staff.assigned', label: 'My Assigned', path: '/assigned', icon: 'fa-solid fa-clipboard-list', parent_id: null, sort_order: 2 },
      { id: 203, code: 'staff.notifications', label: 'Notifications', path: '/notifications', icon: 'fa-regular fa-bell', parent_id: null, sort_order: 3 },
      { id: 204, code: 'staff.profile', label: 'Profile', path: '/profile', icon: 'fa-regular fa-user', parent_id: null, sort_order: 4 },
    ];

    for (const menu of staffMenus) {
      await queryInterface.sequelize.query(
        `
        INSERT INTO menu_items (id, code, label, path, icon, parent_id, sort_order, is_active, "createdAt", "updatedAt")
        SELECT :id, :code, :label, :path, :icon, :parent_id, :sort_order, TRUE, :now, :now
        WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE code = :code)
        `,
        { replacements: { ...menu, now } },
      );
    }

    const [roles] = await queryInterface.sequelize.query(
      `SELECT id, code FROM roles WHERE is_active = TRUE AND UPPER(code) <> 'ADMIN'`,
    );

    const [menuRows] = await queryInterface.sequelize.query(
      `SELECT id, code FROM menu_items WHERE code LIKE 'staff.%' AND is_active = TRUE`,
    );

    const sortByCode = { 'staff.dashboard': 1, 'staff.assigned': 2, 'staff.notifications': 3, 'staff.profile': 4 };

    for (const role of roles) {
      for (const menu of menuRows) {
        const sortOrder = sortByCode[menu.code] ?? 0;
        await queryInterface.sequelize.query(
          `
          INSERT INTO role_menu_items (role_id, menu_item_id, sort_order, "createdAt", "updatedAt")
          SELECT :roleId, :menuId, :sortOrder, :now, :now
          WHERE NOT EXISTS (
            SELECT 1 FROM role_menu_items WHERE role_id = :roleId AND menu_item_id = :menuId
          )
          `,
          { replacements: { roleId: role.id, menuId: menu.id, sortOrder, now } },
        );
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM role_menu_items
      WHERE menu_item_id IN (SELECT id FROM menu_items WHERE code LIKE 'staff.%')
    `);
    await queryInterface.sequelize.query(`
      DELETE FROM menu_items WHERE code LIKE 'staff.%'
    `);
  },
};
