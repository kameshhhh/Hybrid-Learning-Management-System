import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allDay1Tasks = await prisma.skillTask.findMany({
    where: { dayNumber: 1 },
    include: { skill: { select: { name: true } } }
  });

  console.log('All Day 1 Tasks in DB:');
  allDay1Tasks.forEach(t => {
    console.log(`- ${t.id}: ${t.title} (in ${t.skill.name}) [SkillID: ${t.skillId}]`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
