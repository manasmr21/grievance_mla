import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TicketStatus } from './modules/ticketStatus/models/ticketStatus.model';
import { STATUS_CODES } from './common/constants/priority.constants';

const statusesToSeed = [
  { code: STATUS_CODES.ACTIVE, name: 'Pending' },
  { code: STATUS_CODES.UNDER_REVIEW, name: 'Under Review' },
  { code: STATUS_CODES.IN_PROGRESS, name: 'In Progress' },
  { code: STATUS_CODES.RESOLVED, name: 'Resolved' },
  { code: STATUS_CODES.CLOSED, name: 'Closed' },
  { code: STATUS_CODES.REJECTED, name: 'Rejected' },
];

async function seedTicketStatuses() {
  console.log('\n🏷️  Seeding ticket statuses...');
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
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
      }
      console.log(`  ${created ? '✔' : '➖'} ${statusData.name} (${statusData.code})`);
    }
  } finally {
    await app.close();
  }
}

seedTicketStatuses().catch((error) => {
  console.error('Failed to seed ticket statuses:', error);
  process.exitCode = 1;
});
