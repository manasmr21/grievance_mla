import { NestFactory } from '@nestjs/core';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { AppModule } from './app.module';
import { ROLE_CODES } from './common/constants/priority.constants';
import { Role } from './modules/roles/models/roles.model';
import { UserAccount } from './modules/userAccount/models/user.model';

const DEFAULT_PASSWORD = 'password';
const EXCLUDED_ROLE_CODES = [ROLE_CODES.ADMIN, 'STUDENT'];

const resolveRoleIds = (user: UserAccount): number[] => {
  if (!user.role_id) {
    return [];
  }
  const roleId = Number(user.role_id);
  return Number.isFinite(roleId) ? [roleId] : [];
};

const hasExcludedRole = (user: UserAccount, excludedRoleIds: Set<number>): boolean =>
  resolveRoleIds(user).some((roleId) => excludedRoleIds.has(roleId));

async function resetEmployeePasswords() {
  const isDryRun =
    process.argv.includes('--dry-run') ||
    process.env.DRY_RUN === '1' ||
    process.env.DRY_RUN === 'true';
  const password = process.env.EMPLOYEE_DEFAULT_PASSWORD?.trim() || DEFAULT_PASSWORD;

  console.log(`\n🔐 Reset employee passwords${isDryRun ? ' (DRY RUN — no changes will be written)' : ''}...`);

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const excludedRoles = await Role.findAll({
      where: { code: { [Op.in]: EXCLUDED_ROLE_CODES } },
      attributes: ['id', 'code', 'name'],
    });

    const foundCodes = new Set(excludedRoles.map((role) => role.code));
    for (const code of EXCLUDED_ROLE_CODES) {
      if (!foundCodes.has(code)) {
        throw new Error(`Required role "${code}" was not found in the database. Run db:seed first.`);
      }
    }

    const excludedRoleIds = new Set(excludedRoles.map((role) => Number(role.id)));
    const users = await UserAccount.findAll({
      attributes: ['id', 'email', 'name', 'role_id', 'account_status'],
      order: [['id', 'ASC']],
    });

    const targets: UserAccount[] = [];
    const skipped: UserAccount[] = [];

    for (const user of users) {
      if (hasExcludedRole(user, excludedRoleIds)) {
        skipped.push(user);
      } else {
        targets.push(user);
      }
    }

    console.log(`\nSummary:`);
    console.log(`  Total user accounts: ${users.length}`);
    console.log(`  Skipped (ADMIN/STUDENT): ${skipped.length}`);
    console.log(`  To update: ${targets.length}`);

    if (skipped.length > 0) {
      console.log('\nSkipped accounts:');
      for (const user of skipped) {
        console.log(`  - [${user.id}] ${user.email} (${user.name})`);
      }
    }

    if (targets.length === 0) {
      console.log('\nNothing to update.');
      return;
    }

    console.log('\nTarget accounts:');
    for (const user of targets) {
      console.log(`  - [${user.id}] ${user.email} (${user.name}) [${user.account_status}]`);
    }

    if (isDryRun) {
      console.log('\nDry run complete. Re-run without --dry-run to apply changes.');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    for (const user of targets) {
      await user.update({ password: hashedPassword });
    }

    console.log(`\n✅ Updated ${targets.length} employee password(s).`);
  } catch (error) {
    console.error('\n❌ Error resetting employee passwords:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void resetEmployeePasswords();
