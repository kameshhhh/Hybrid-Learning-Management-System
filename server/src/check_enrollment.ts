import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.user.findFirst({
    where: { fullName: 'Chandru' }
  });

  if (!student) {
    console.log('Student Chandru not found');
    return;
  }

  console.log('Student found:', student.id);

  const enrollments = await prisma.studentSkill.findMany({
    where: { studentId: student.id },
    include: { skill: { select: { name: true, id: true, status: true } } }
  });

  console.log('Enrollments:', JSON.stringify(enrollments, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
