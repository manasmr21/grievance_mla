import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Role } from './modules/roles/models/roles.model';
import { TicketPriority } from './modules/ticketPriority/models/ticketPriority.model';
import { TicketStatus } from './modules/ticketStatus/models/ticketStatus.model';
import { GrievanceCategory } from './modules/grievanceCategory/models/grievanceCategory.model';
import { GrievanceSubCategory } from './modules/grievanceSubCategory/models/grievanceSubCategory.model';
import { GrievanceType } from './modules/grievanceType/models/grievanceType.model';
import { UserAccount } from './modules/userAccount/models/user.model';
import bcrypt from 'bcrypt';
import { PRIORITY_CODES, ROLE_CODES, SLA_HOURS, STATUS_CODES } from './common/constants/priority.constants';
import { seedMenus } from './seed-menus';

async function seed() {
  console.log('🌱 Starting database seeding...');

  // Create standalone NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    // 1. Seed Roles — only ADMIN is seeded; create other roles via Role Manager
    const rolesToSeed = [
      { code: ROLE_CODES.ADMIN, name: 'Admin' },
    ];

    console.log('\n👥 Seeding Roles...');
    for (const roleData of rolesToSeed) {
      const [role, created] = await Role.findOrCreate({
        where: { code: roleData.code },
        defaults: {
          name: roleData.name,
          code: roleData.code,
          is_active: true,
        },
      });
      if (created) {
        console.log(`  ✔ Role "${roleData.name}" (${roleData.code}) created successfully.`);
      } else {
        console.log(`  ➖ Role "${roleData.name}" (${roleData.code}) already exists.`);
      }
    }

    await seedMenus();

    // 3. Seed Ticket Statuses (required for grievance submission)
    const prioritiesToSeed = [
      { code: PRIORITY_CODES.EMERGENCY, name: 'Emergency', resolution_hours: SLA_HOURS.EMERGENCY },
      { code: PRIORITY_CODES.URGENT, name: 'Urgent', resolution_hours: SLA_HOURS.URGENT },
      { code: PRIORITY_CODES.ROUTINE, name: 'Routine', resolution_hours: SLA_HOURS.ROUTINE },
    ];

    console.log('\n⚡ Seeding Ticket Priorities...');
    for (const priorityData of prioritiesToSeed) {
      const [priority, created] = await TicketPriority.findOrCreate({
        where: { code: priorityData.code },
        defaults: {
          name: priorityData.name,
          code: priorityData.code,
          resolution_hours: priorityData.resolution_hours,
          is_active: true,
        },
      });

      // Update existing priorities with resolution_hours if they don't have it
      if (!created && !priority.resolution_hours) {
        await priority.update({
          resolution_hours: priorityData.resolution_hours,
          name: priorityData.name
        });
        console.log(`  ✔ Ticket Priority "${priorityData.name}" (${priorityData.code}) updated with resolution hours.`);
      } else if (created) {
        console.log(`  ✔ Ticket Priority "${priorityData.name}" (${priorityData.code}) created successfully with ${priorityData.resolution_hours} hours SLA.`);
      } else {
        console.log(`  ➖ Ticket Priority "${priorityData.name}" (${priorityData.code}) already exists.`);
      }
    }

    // 3. Seed Ticket Statuses (required for grievance submission)
    const statusesToSeed = [
      { code: STATUS_CODES.ACTIVE, name: 'Pending' },
      { code: STATUS_CODES.UNDER_REVIEW, name: 'Under Review' },
      { code: STATUS_CODES.IN_PROGRESS, name: 'In Progress' },
      { code: STATUS_CODES.RESOLVED, name: 'Resolved' },
      { code: STATUS_CODES.CLOSED, name: 'Closed' },
      { code: STATUS_CODES.REJECTED, name: 'Rejected' },
    ];

    console.log('\n🏷️  Seeding Ticket Statuses...');
    for (const statusData of statusesToSeed) {
      const [status, created] = await TicketStatus.findOrCreate({
        where: { code: statusData.code },
        defaults: {
          name: statusData.name,
          code: statusData.code,
          is_active: true,
        },
      });

      if (!created && status.name !== statusData.name) {
        await status.update({ name: statusData.name, is_active: true });
        console.log(`  ✔ Ticket Status "${statusData.name}" (${statusData.code}) updated.`);
      } else if (created) {
        console.log(`  ✔ Ticket Status "${statusData.name}" (${statusData.code}) created.`);
      } else {
        console.log(`  ➖ Ticket Status "${statusData.name}" (${statusData.code}) already exists.`);
      }
    }

    // 4. Seed test Grievance Type, Category, and Sub-category
    console.log('\n📂 Seeding test Grievance Type, Category, and Sub-category...');

    const [testType, typeCreated] = await GrievanceType.findOrCreate({
      where: { code: 'TEST' },
      defaults: {
        name: 'Test Type',
        code: 'TEST',
        is_active: true,
      },
    });
    console.log(typeCreated
      ? `  ✔ Type "Test Type" (TEST) created.`
      : `  ➖ Type "Test Type" (TEST) already exists.`);

    const [testCategory, categoryCreated] = await GrievanceCategory.findOrCreate({
      where: { code: 'TEST_CATEGORY' },
      defaults: {
        name: 'Test Category',
        code: 'TEST_CATEGORY',
        type_id: testType.id,
        is_active: true,
      },
    });
    console.log(categoryCreated
      ? `  ✔ Category "Test Category" (TEST_CATEGORY) created.`
      : `  ➖ Category "Test Category" (TEST_CATEGORY) already exists.`);

    const [, subCreated] = await GrievanceSubCategory.findOrCreate({
      where: { code: 'TEST_SUB_CATEGORY' },
      defaults: {
        name: 'Test Sub Category',
        code: 'TEST_SUB_CATEGORY',
        category_id: testCategory.id,
        is_active: true,
      },
    });
    console.log(subCreated
      ? `  ✔ Sub-category "Test Sub Category" (TEST_SUB_CATEGORY) created.`
      : `  ➖ Sub-category "Test Sub Category" (TEST_SUB_CATEGORY) already exists.`);

    const [quickPhotoCategory, quickPhotoCreated] = await GrievanceCategory.findOrCreate({
      where: { code: 'QUICK_PHOTO' },
      defaults: {
        name: 'Photo Report',
        code: 'QUICK_PHOTO',
        type_id: testType.id,
        is_active: true,
      },
    });
    console.log(quickPhotoCreated
      ? `  ✔ Category "Photo Report" (QUICK_PHOTO) created.`
      : `  ➖ Category "Photo Report" (QUICK_PHOTO) already exists.`);

    await GrievanceSubCategory.findOrCreate({
      where: { code: 'QUICK_PHOTO_SUB' },
      defaults: {
        name: 'Photo Report',
        code: 'QUICK_PHOTO_SUB',
        category_id: quickPhotoCategory.id,
        is_active: true,
      },
    });

    // 5. Seed Default Admin User Account
    console.log('\n👤 Seeding Default Admin User Account...');
    const adminEmail = 'admin@gmail.com';
    const rawPassword = 'password';

    const existingAdmin = await UserAccount.findOne({ where: { email: adminEmail } });
    if (existingAdmin) {
      console.log(`  ➖ Admin user account with email "${adminEmail}" already exists.`);
    } else {
      const adminRole = await Role.findOne({ where: { code: ROLE_CODES.ADMIN } });
      if (!adminRole) {
        throw new Error('ADMIN role not found in the system. Seed roles first.');
      }

      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      const newAdmin = await UserAccount.create({
        name: 'Administrator',
        email: adminEmail,
        password: hashedPassword,
        role_id: adminRole.id,
        account_status: 'active',
        dashboard_route: '/admin/dashboard',
      });
      console.log(`  ✔ Admin user account "${newAdmin.name}" (${adminEmail}) created successfully with hashed password.`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
  } finally {
    await app.close();
  }
}

seed();
