import prisma from './src/config/database';

(async () => {
  try {
    const res = await prisma.skillTask.findMany({
      where: {
        id: { notIn: ["none"] },
      }
    });
    console.log('success');
  } catch (err: any) {
    console.error('ERROR', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
