import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const skill = await prisma.skill.findFirst({
    where: { name: { contains: 'Test' } }
  });
  console.log(JSON.stringify(skill, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
