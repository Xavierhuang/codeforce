import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Default admin credentials (can be overridden via environment variables)
  // Trim whitespace to prevent issues with .env formatting
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@codeforce.com').trim()
  const adminPassword = (process.env.ADMIN_PASSWORD || 'admin123456').trim()
  const adminName = (process.env.ADMIN_NAME || 'Admin User').trim()

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    console.log('✅ Admin user already exists:', adminEmail)
    
    // Update to admin role if not already
    if (existingAdmin.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { role: 'ADMIN' },
      })
      console.log('✅ Updated user to admin role')
    }
    return
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: adminName,
      hashedPassword,
      role: 'ADMIN',
      verificationStatus: 'VERIFIED', // Admins are auto-verified
    },
  })

  console.log('✅ Default admin user created!')
  console.log('📧 Email:', adminEmail)
  console.log('🔑 Password:', adminPassword)
  console.log('⚠️  Please change the default password after first login!')
  console.log('')
  console.log('You can customize these credentials by setting environment variables:')
  console.log('  ADMIN_EMAIL=your-email@example.com')
  console.log('  ADMIN_PASSWORD=your-secure-password')
  console.log('  ADMIN_NAME=Your Name')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

