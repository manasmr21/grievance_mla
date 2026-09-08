'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menu_items
      SET path = regexp_replace(path, '^/(admin|staff|hod)(?=/)', ''),
          "updatedAt" = NOW()
      WHERE path IS NOT NULL
        AND path ~ '^/(admin|staff|hod)/'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menu_items
      SET path = CASE
        WHEN code LIKE 'admin.%' AND path IS NOT NULL AND path NOT LIKE '/admin/%'
          THEN '/admin' || path
        WHEN code LIKE 'staff.%' AND path IS NOT NULL AND path NOT LIKE '/staff/%'
          THEN '/staff' || path
        ELSE path
      END,
      "updatedAt" = NOW()
      WHERE path IS NOT NULL
    `);
  },
};
