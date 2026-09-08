import { Role } from './modules/roles/models/roles.model';
import { MenuItem } from './modules/menu/models/menu-item.model';
import { RoleMenuItem } from './modules/menu/models/role-menu-item.model';
import { ROLE_CODES } from './common/constants/priority.constants';
import { Op } from 'sequelize';

const MENU_ITEMS = [
  { id: 101, code: 'admin.dashboard', label: 'Dashboard', path: '/dashboard', icon: 'fa-solid fa-house', parent_id: null, sort_order: 1 },
  { id: 100, code: 'admin.group.operations', label: 'Operations', path: null, icon: 'fa-solid fa-briefcase', parent_id: null, sort_order: 2 },
  { id: 102, code: 'admin.grievances', label: 'Manage Grievances', path: '/grievances', icon: 'fa-solid fa-clipboard-list', parent_id: 100, sort_order: 1 },
  { id: 103, code: 'admin.reports', label: 'Reports', path: '/reports', icon: 'fa-solid fa-chart-bar', parent_id: 100, sort_order: 2 },
  { id: 104, code: 'admin.notifications', label: 'Notifications', path: '/notifications', icon: 'fa-regular fa-bell', parent_id: 100, sort_order: 3 },

  { id: 110, code: 'admin.group.master_data', label: 'Master Data', path: null, icon: 'fa-solid fa-database', parent_id: null, sort_order: 3 },
  { id: 111, code: 'admin.users', label: 'Manage Users', path: '/users', icon: 'fa-solid fa-users-gear', parent_id: 110, sort_order: 1 },
  { id: 113, code: 'admin.departments', label: 'Department Manager', path: '/departments', icon: 'fa-solid fa-building', parent_id: 110, sort_order: 2 },
  { id: 114, code: 'admin.roles', label: 'Role Manager', path: '/roles', icon: 'fa-solid fa-shield-halved', parent_id: 110, sort_order: 3 },
  { id: 115, code: 'admin.categories', label: 'Category Manager', path: '/categories', icon: 'fa-regular fa-folder-open', parent_id: 110, sort_order: 4 },
  { id: 116, code: 'admin.ticket_management', label: 'Ticket Management', path: '/ticket-management', icon: 'fa-solid fa-tags', parent_id: 110, sort_order: 5 },
  { id: 117, code: 'admin.grievance_paths', label: 'Grievance Paths', path: '/grievance-paths', icon: 'fa-solid fa-route', parent_id: 110, sort_order: 6 },
  { id: 119, code: 'admin.menus', label: 'Menu Manager', path: '/menus', icon: 'fa-solid fa-bars', parent_id: 110, sort_order: 7 },

  { id: 120, code: 'admin.group.compliance', label: 'Compliance', path: null, icon: 'fa-solid fa-scale-balanced', parent_id: null, sort_order: 4 },
  { id: 121, code: 'admin.audit_logs', label: 'Audit Logs', path: '/audit-logs', icon: 'fa-solid fa-clock-rotate-left', parent_id: 120, sort_order: 1 },

  { id: 130, code: 'admin.profile', label: 'Profile', path: '/profile', icon: 'fa-regular fa-user', parent_id: null, sort_order: 5 },
];

const STAFF_MENU_ITEMS = [
  { id: 201, code: 'staff.dashboard', label: 'Dashboard', path: '/dashboard', icon: 'fa-solid fa-house', parent_id: null, sort_order: 1 },
  { id: 202, code: 'staff.assigned', label: 'My Assigned', path: '/assigned', icon: 'fa-solid fa-clipboard-list', parent_id: null, sort_order: 2 },
  { id: 203, code: 'staff.notifications', label: 'Notifications', path: '/notifications', icon: 'fa-regular fa-bell', parent_id: null, sort_order: 3 },
  { id: 204, code: 'staff.profile', label: 'Profile', path: '/profile', icon: 'fa-regular fa-user', parent_id: null, sort_order: 4 },
];

const STAFF_MENU_SORT: Record<string, number> = {
  'staff.dashboard': 1,
  'staff.assigned': 2,
  'staff.notifications': 3,
  'staff.profile': 4,
};

const ADMIN_MENU_ITEMS: Array<{ menu_item_id: number; sort_order: number }> = [
  { menu_item_id: 101, sort_order: 1 },
  { menu_item_id: 100, sort_order: 2 },
  { menu_item_id: 102, sort_order: 3 },
  { menu_item_id: 103, sort_order: 4 },
  { menu_item_id: 104, sort_order: 5 },
  { menu_item_id: 110, sort_order: 6 },
  { menu_item_id: 111, sort_order: 7 },
  { menu_item_id: 113, sort_order: 8 },
  { menu_item_id: 114, sort_order: 9 },
  { menu_item_id: 115, sort_order: 10 },
  { menu_item_id: 116, sort_order: 11 },
  { menu_item_id: 117, sort_order: 12 },
  { menu_item_id: 119, sort_order: 13 },
  { menu_item_id: 120, sort_order: 14 },
  { menu_item_id: 121, sort_order: 15 },
  { menu_item_id: 130, sort_order: 16 },
];

export async function seedMenus(): Promise<void> {
  console.log('\n📋 Seeding Menus...');

  for (const item of MENU_ITEMS) {
    const [menuItem, created] = await MenuItem.findOrCreate({
      where: { code: item.code },
      defaults: {
        id: item.id,
        code: item.code,
        label: item.label,
        path: item.path,
        icon: item.icon,
        parent_id: item.parent_id,
        sort_order: item.sort_order,
        is_active: true,
      },
    });

    if (!created) {
      await menuItem.update({
        label: item.label,
        path: item.path,
        icon: item.icon,
        parent_id: item.parent_id,
        sort_order: item.sort_order,
        is_active: true,
      });
    }

    console.log(`  ${created ? '✔' : '➖'} Menu "${item.label}" (${item.code})`);
  }

  for (const item of STAFF_MENU_ITEMS) {
    const [menuItem, created] = await MenuItem.findOrCreate({
      where: { code: item.code },
      defaults: {
        id: item.id,
        code: item.code,
        label: item.label,
        path: item.path,
        icon: item.icon,
        parent_id: item.parent_id,
        sort_order: item.sort_order,
        is_active: true,
      },
    });

    if (!created) {
      await menuItem.update({
        label: item.label,
        path: item.path,
        icon: item.icon,
        parent_id: item.parent_id,
        sort_order: item.sort_order,
        is_active: true,
      });
    }

    console.log(`  ${created ? '✔' : '➖'} Staff menu "${item.label}" (${item.code})`);
  }

  // Retire legacy Assignment Rules menu if it still exists as a separate row
  await MenuItem.update(
    { is_active: false },
    {
      where: {
        code: { [Op.in]: ['admin.assignment_rules', 'admin.assignment_rule'] },
      },
    },
  );

  const adminRole = await Role.findOne({ where: { code: ROLE_CODES.ADMIN } });
  if (!adminRole) {
    console.log('  ⚠ ADMIN role not found — skipping menu role assignments.');
    return;
  }

  for (const entry of ADMIN_MENU_ITEMS) {
    await RoleMenuItem.findOrCreate({
      where: { role_id: adminRole.id, menu_item_id: entry.menu_item_id },
      defaults: {
        role_id: adminRole.id,
        menu_item_id: entry.menu_item_id,
        sort_order: entry.sort_order,
      },
    });
  }

  // Ensure Grievance Paths is linked even if menu id differs from seed constant
  const grievancePathsMenu = await MenuItem.findOne({
    where: { code: 'admin.grievance_paths', is_active: true },
  });
  if (grievancePathsMenu) {
    await RoleMenuItem.findOrCreate({
      where: { role_id: adminRole.id, menu_item_id: grievancePathsMenu.id },
      defaults: {
        role_id: adminRole.id,
        menu_item_id: grievancePathsMenu.id,
        sort_order: 12,
      },
    });
  }

  console.log('  ✔ Admin menu assignments seeded.');

  const staffMenus = await MenuItem.findAll({
    where: { code: { [Op.like]: 'staff.%' }, is_active: true },
  });
  const staffRoles = await Role.findAll({
    where: { is_active: true, code: { [Op.ne]: ROLE_CODES.ADMIN } },
  });

  for (const staffRole of staffRoles) {
    for (const menuItem of staffMenus) {
      await RoleMenuItem.findOrCreate({
        where: { role_id: staffRole.id, menu_item_id: menuItem.id },
        defaults: {
          role_id: staffRole.id,
          menu_item_id: menuItem.id,
          sort_order: STAFF_MENU_SORT[menuItem.code] ?? menuItem.sort_order,
        },
      });
    }
  }

  console.log(`  ✔ Staff menu assignments seeded for ${staffRoles.length} non-admin role(s).`);

  if (MenuItem.sequelize) {
    await MenuItem.sequelize.query(
      `SELECT setval(pg_get_serial_sequence('menu_items', 'id'), COALESCE((SELECT MAX(id) FROM menu_items), 1))`,
    );
  }
}
