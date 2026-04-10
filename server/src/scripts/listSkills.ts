import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const skills = await prisma.skill.findMany({
    select: { id: true, name: true }
  });
  console.log(JSON.stringify(skills, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
