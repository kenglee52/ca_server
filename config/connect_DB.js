const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ทดสอบการเชื่อมต่อ
async function testConnection() {
  try {
    await prisma.$connect()
    console.log('✅ Connected to PostgreSQL database with Prisma.')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  }
}

testConnection()

module.exports = prisma
