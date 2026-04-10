import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  const studentId = '59bb16f6-6090-4580-90ff-7c4805eff7e1';
  const skillId = '738e09fe-997a-45cf-8327-f4204e828748'; // Welding 1

  console.log('--- Checking Student Enrollment ---');
  const enrollment = await prisma.studentSkill.findUnique({
    where: { studentId_skillId: { studentId, skillId } }
  });
  console.log('Enrollment:', JSON.stringify(enrollment, null, 2));

  console.log('\n--- Checking Curriculum Blocks ---');
  const chapters = await prisma.skillChapter.findMany({
    where: { skillId }
  });
  
  const taskBlocks = chapters.flatMap(c => {
    const blocks = (c.blocks as any[]) || [];
    return blocks.filter(b => b.type === 'task').map(b => ({
      chapterId: c.id,
      taskId: b.content?.taskId,
      title: b.content?.title
    }));
  });
  console.log('Task Blocks found in Curriculum:', JSON.stringify(taskBlocks, null, 2));

  const taskIds = taskBlocks.map(b => b.taskId).filter(Boolean);

  console.log('\n--- Checking Student Submissions ---');
  const assessments = await prisma.dailyAssessment.findMany({
    where: { 
      studentId,
      taskId: { in: taskIds } 
    },
    include: {
      task: { select: { title: true, skillId: true } }
    }
  });
  console.log('Submissions found for these tasks:', JSON.stringify(assessments, null, 2));

  console.log('\n--- Checking All Submissions for Student ---');
  const allSubmissions = await prisma.dailyAssessment.findMany({
    where: { studentId },
    include: {
      task: { select: { title: true, skillId: true } }
    }
  });
  console.log('Count of all submissions for student:', allSubmissions.length);
  if (allSubmissions.length > 0) {
    console.log('Sample submission taskIds:', allSubmissions.map(a => a.taskId));
  }

  process.exit(0);
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
