import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStudentSkillColumns() {
  try {
    const columns: any[] = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'student_skills'
      ORDER BY column_name;
    `;
    console.log('Columns in student_skills table:');
    columns.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudentSkillColumns();
