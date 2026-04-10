import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.user.findFirst({
    where: { fullName: 'Chandru' }
  });

  if (!student) {
    console.log('Student not found');
    return;
  }

  console.log(`Student ID: ${student.id}`);

  const enrollments = await prisma.studentSkill.findMany({
    where: { studentId: student.id },
    include: { skill: { select: { name: true } } }
  });

  console.log('Enrollments:');
  enrollments.forEach(e => {
    console.log(`- ${e.skillId}: ${e.skill.name} (${e.status})`);
  });

  const tasksFound = await prisma.skillTask.findMany({
    where: {
      OR: [
        { dayNumber: 1 },
        { title: { contains: '01', mode: 'insensitive' } }
      ]
    },
    include: { skill: { select: { name: true } } }
  });

  console.log('\nPotential Tasks (Day 1 or contains "01"):');
  tasksFound.forEach(t => {
    console.log(`- ${t.id}: ${t.title} (Day ${t.dayNumber}) in ${t.skill.name} [Status: ${t.status}]`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
