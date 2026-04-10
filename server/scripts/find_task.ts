import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const task = await prisma.skillTask.findFirst({
    where: { title: { contains: 'To study welding tools', mode: 'insensitive' } }
  });
  console.log(JSON.stringify(task, null, 2));
}

main().finally(() => prisma.$disconnect());
