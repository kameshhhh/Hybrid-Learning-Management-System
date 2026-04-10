import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const columns: any[] = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY column_name;
    `;
    const names = columns.map(c => c.column_name);
    console.log('Columns list:', JSON.stringify(names));
    console.log('Includes roll_number:', names.includes('roll_number'));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();
