import { PrismaClient } from './src/config/database'; 
const prisma = new PrismaClient(); 
async function check() { 
  const ss = await prisma.studentSkill.findMany({ include: { student: true } }); 
  console.log('Null students in studentSkill:', ss.filter(s => !s.student).length); 
  const da = await prisma.dailyAssessment.findMany({ include: { task: true, student: true } });
  console.log('Null tasks in dailyAssessment:', da.filter(d => !d.task).length); 
  const sf = await prisma.skillFaculty.findMany({ include: { skill: true } });
  console.log('Null skills in skillFaculty:', sf.filter(s => !s.skill).length);
  process.exit(0);
} 
check().catch(e => { console.error(e); process.exit(1); });
