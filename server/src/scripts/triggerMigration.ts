import { PrismaClient } from '@prisma/client';
import { migrateChapterToBlocks } from '../utils/migration/legacyToBlocks';

const prisma = new PrismaClient();
const SKILL_ID = '738e09fe-997a-45cf-8327-f4204e828748';

async function main() {
  console.log('--- MIGRATION START ---');
  
  const chapters = await prisma.skillChapter.findMany({
    where: { skillId: SKILL_ID },
    include: { lessons: true }
  });

  console.log(`Found ${chapters.length} chapters to migrate.`);

  for (const chapter of chapters) {
    console.log(`Migrating: ${chapter.title}...`);
    const blocks = migrateChapterToBlocks(chapter);
    
    await prisma.skillChapter.update({
      where: { id: chapter.id },
      data: {
        blocks: blocks as any,
        schemaVersion: 1
      }
    });
    console.log(`Success: ${chapter.title} now has ${blocks.length} blocks.`);
  }

  // Enable block system for this skill
  await prisma.skill.update({
    where: { id: SKILL_ID },
    data: { useBlockSystem: true }
  });

  console.log('--- MIGRATION COMPLETE ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
