import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const skill = await prisma.skill.findFirst({
    where: { 
      id: '738e09fe-997a-45cf-8327-f4204e828748' 
    },
    include: {
      chapters: {
        include: {
          blocks: true
        }
      }
    }
  });

  if (!skill) {
    console.log("Skill not found");
    return;
  }

  skill.chapters.forEach(chapter => {
    console.log(`Chapter: ${chapter.title}`);
    chapter.blocks.forEach(block => {
      if (block.type === 'video') {
        console.log(`- Video Block: ${JSON.stringify(block.content)}`);
      }
    });
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
