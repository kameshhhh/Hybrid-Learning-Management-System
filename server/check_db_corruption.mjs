import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Starting DB corruption check...");

  // Check SkillChapter blocks
  const chapters = await prisma.skillChapter.findMany();
  console.log(`Checking ${chapters.length} chapters...`);
  let corruptedBlocksCount = 0;
  
  for (const chapter of chapters) {
    if (chapter.blocks) {
      const blocks = chapter.blocks; // This is a Json array in schema
      if (Array.isArray(blocks)) {
        for (const block of blocks) {
          const contentStr = JSON.stringify(block.content);
          if (contentStr.includes('undefined')) {
            console.log(`[CORRUPTED BLOCK] Chapter: ${chapter.title} (ID: ${chapter.id})`);
            console.log(`  Block ID: ${block.id}, Type: ${block.type}`);
            console.log(`  URL: ${block.content?.url}`);
            corruptedBlocksCount++;
          }
        }
      }
    }
  }

  // Check SkillLesson videoUrls
  const lessons = await prisma.skillLesson.findMany();
  console.log(`Checking ${lessons.length} lessons...`);
  let corruptedLessonsCount = 0;

  for (const lesson of lessons) {
    if (lesson.videoUrl && lesson.videoUrl.includes('undefined')) {
      console.log(`[CORRUPTED LESSON] Lesson: ${lesson.title} (ID: ${lesson.id})`);
      console.log(`  URL: ${lesson.videoUrl}`);
      corruptedLessonsCount++;
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Chapters checked: ${chapters.length}`);
  console.log(`Corrupted blocks found: ${corruptedBlocksCount}`);
  console.log(`Lessons checked: ${lessons.length}`);
  console.log(`Corrupted lessons found: ${corruptedLessonsCount}`);

  if (corruptedBlocksCount > 0 || corruptedLessonsCount > 0) {
    console.log("\nRecommendation: Run a fix script to remove 'undefined' from these URLs.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
