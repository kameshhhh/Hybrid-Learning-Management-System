import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const chapters = await prisma.skillChapter.findMany();
  for (const chapter of chapters) {
    if (chapter.blocks && Array.isArray(chapter.blocks)) {
      console.log(`\nChapter: ${chapter.title} (${chapter.id})`);
      chapter.blocks.forEach(block => {
        if (block.type === 'video') {
          console.log(`  - Video Block: ID=${block.id}, Content=${JSON.stringify(block.content)}`);
        }
      });
    }
  }
}

main().finally(() => prisma.$disconnect());
