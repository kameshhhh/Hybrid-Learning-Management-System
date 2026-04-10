import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'test.student@example.com';
  const password = await bcrypt.hash('Test@123', 12);
  
  const user = await prisma.user.create({
    data: {
      username: 'teststudent',
      email: email,
      passwordHash: password,
      fullName: 'Test Student',
      role: 'student',
      isActive: true,
    }
  });
  console.log('✅ Created user:', user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
