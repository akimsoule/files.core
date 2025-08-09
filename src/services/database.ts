import { PrismaClient } from '@prisma/client';

// Instance singleton de Prisma
const prisma = new PrismaClient();

export default prisma;
