import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFacultyStudents() {
  try {
    console.log('Testing student selection from studentSkill relation...');
    const enrollment = await (prisma as any).studentSkill.findFirst({
        include: {
          student: {
            select: { id: true, fullName: true, email: true, rollNumber: true },
          },
        },
    });
    console.log('Enrollment found:', enrollment ? 'Yes' : 'No');
    if (enrollment) {
      console.log('Student rollNumber:', enrollment.student.rollNumber);
    }
  } catch (e: any) {
    console.error('FAILED:');
    console.error(e.message);
    if (e.code) console.error('Prisma Code:', e.code);
  } finally {
    await prisma.$disconnect();
  }
}

testFacultyStudents();
