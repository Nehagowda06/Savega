// Test database connection
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@')); // Hide password
    
    await prisma.$connect();
    console.log('✅ Connection successful!');
    
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('Database version:', result);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nPossible issues:');
    console.error('1. Password is incorrect');
    console.error('2. Special characters not properly encoded');
    console.error('3. Database not accessible');
    process.exit(1);
  }
}

testConnection();
