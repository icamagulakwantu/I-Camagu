import { PrismaClient } from '@prisma/client';

// A single, shared Prisma Client instance for the whole app.
// Importing this file anywhere gives you the same connected client —
// never create multiple PrismaClient instances, it wastes database connections.
const prisma = new PrismaClient();

export default prisma;
