import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFinalRouteLogic() {
  try {
    console.log('--- Final Route Logic Audit ---');
    
    // Testing the critical findMany for Faculty Students tab
    const enrollments = await prisma.studentSkill.findMany({
      take: 5,
      include: {
        student: {
          select: { 
            id: true, 
            fullName: true, 
            email: true, 
            rollNumber: true // This is the field we synchronized
          },
        },
      },
    });

    console.log(`Found ${enrollments.length} enrollments.`);
    enrollments.forEach((e, i) => {
      console.log(`[${i}] Student: ${e.student.fullName}, RollNumber: ${e.student.rollNumber || 'N/A'}`);
    });

    if (enrollments.length > 0) {
      console.log('SUCCESS: Relation and rollNumber query is stable.');
    } else {
      console.log('WARNING: No enrollments found in DB to test.');
    }

  } catch (e: any) {
    console.error('CRITICAL FAILURE:');
    console.error(e.message);
  } finally {
    await prisma.$disconnect();
  }
}

testFinalRouteLogic();
