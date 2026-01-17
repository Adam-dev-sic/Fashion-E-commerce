// prismaClient.js
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// create a pool with your DATABASE_URL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// build the adapter from the pool
const adapter = new PrismaPg(pool);

// safe global singleton for dev hot-reload
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
