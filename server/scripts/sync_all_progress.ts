import { PrismaClient } from '@prisma/client';
import { progressService } from '../src/services/progress.service';

const prisma = new PrismaClient();

async function syncAll() {
  console.log('--- Starting Global Progress Sync ---');
  
  const enrollments = await prisma.studentSkill.findMany({
    where: { status: 'active' },
    select: { studentId: true, skillId: true }
  });

  console.log(`Found ${enrollments.length} active enrollments to sync.`);

  for (let i = 0; i < enrollments.length; i++) {
    const { studentId, skillId } = enrollments[i];
    try {
      await progressService.recalculateSkillProgress(studentId, skillId);
      if ((i + 1) % 10 === 0) {
        console.log(`Synced ${i + 1}/${enrollments.length}...`);
      }
    } catch (err) {
      console.error(`Failed to sync student ${studentId} for skill ${skillId}:`, err);
    }
  }

  console.log('--- Sync Complete ---');
  process.exit(0);
}

syncAll().catch(err => {
  console.error(err);
  process.exit(1);
});
