import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
console.log('Prisma Models:', Object.keys(prisma).filter(k => !k.startsWith('$')));
prisma.$disconnect();
