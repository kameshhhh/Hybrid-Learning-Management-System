import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testUpdate() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No user found to update');
      return;
    }
    
    console.log(`Updating user ${user.id} with rollNumber: TEST-123`);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { rollNumber: 'TEST-123' },
    });
    console.log('Update success!', updated.rollNumber);
    
    // Clear it back
    await prisma.user.update({
      where: { id: user.id },
      data: { rollNumber: null },
    });
    console.log('Reverted rollNumber to null');
    
  } catch (e: any) {
    console.error('FAILED:');
    console.error(e.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdate();
