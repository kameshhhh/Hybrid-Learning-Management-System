import prisma from './src/config/database';
prisma.studentSkill.findMany({ 
  include: { 
    skill: { 
      select: { 
        id: true, 
        name: true, 
        skillCode: true, 
        description: true,
        _count: { select: { chapters: true, tasks: true } } 
      } 
    } 
  } 
}).then(res => console.log('success', JSON.stringify(res))).catch(err => console.error('ERROR', err.message)).finally(() => prisma.$disconnect());
