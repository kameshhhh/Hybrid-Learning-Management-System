import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFetch() {
  try {
    const user = await prisma.user.findFirst();
    console.log('First user:', user);
  } catch (e) {
    console.error('Fetch failed:');
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

testFetch();
