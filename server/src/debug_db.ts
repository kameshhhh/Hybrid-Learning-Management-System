import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.skillTask.findMany({
    where: {
      title: { contains: 'Welding', mode: 'insensitive' }
    },
    select: {
      id: true,
      title: true,
      status: true,
      skillId: true,
      dayNumber: true
    }
  });
  console.log('Tasks found:', JSON.stringify(tasks, null, 2));

  const skills = await prisma.skill.findMany({
    where: {
      name: { contains: 'Welding', mode: 'insensitive' }
    },
    select: {
      id: true,
      name: true,
      status: true
    }
  });
  console.log('Skills found:', JSON.stringify(skills, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
