import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const chapters = await prisma.skillChapter.findMany();
  for (const chapter of chapters) {
    if (chapter.blocks && Array.isArray(chapter.blocks)) {
      for (const block of chapter.blocks) {
        if (block.type === 'video' && block.content?.provider === 'upload') {
          console.log(`VIDEO_URL: ${block.content.url}`);
          // Just need one
          process.exit(0);
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
