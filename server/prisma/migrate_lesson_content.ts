// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Lesson Content Migration ---');
  
  const migrationLog: any[] = [];
  const logPath = path.join(process.cwd(), 'prisma', 'migration_log.json');

  try {
    const lessons = await prisma.skillLesson.findMany({
      where: {
        textContent: { not: null, not: "" }
      },
      include: {
        contents: {
          where: { type: 'THEORY' }
        }
      }
    });

    console.log(`Found ${lessons.length} lessons with potential legacy textContent.`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const lesson of lessons) {
      const trimmedContent = lesson.textContent?.trim();
      
      if (!trimmedContent) {
        skippedCount++;
        continue;
      }

      // Idempotency check: Does it already have a THEORY content?
      if (lesson.lessonContents.length > 0) {
        console.log(`Skipping lesson "${lesson.title}" (${lesson.id}) - already has THEORY content.`);
        skippedCount++;
        continue;
      }

      if (trimmedContent.length > 10000) {
        console.warn(`Warning: Lesson "${lesson.title}" (${lesson.id}) has very large content (${trimmedContent.length} chars).`);
      }

      // Create structured THEORY content
      await prisma.lessonContent.create({
        data: {
          lessonId: lesson.id,
          type: 'THEORY',
          content: trimmedContent,
          orderIndex: 0
        }
      });

      migrationLog.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        migratedAt: new Date().toISOString()
      });

      migratedCount++;
    }

    console.log(`Migration complete. Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
    
    // Write log
    fs.writeFileSync(logPath, JSON.stringify(migrationLog, null, 2));
    console.log(`Migration log written to ${logPath}`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
