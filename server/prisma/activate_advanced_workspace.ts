import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Advanced Workspace Migration...');
  
  const result = await prisma.skill.updateMany({
    where: {
      useBlockSystem: false,
    },
    data: {
      useBlockSystem: true,
    },
  });

  console.log(`✅ Successfully activated Advanced Workspace for ${result.count} skills.`);
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
