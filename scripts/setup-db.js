#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Setting up NekoMart database...\n');

try {
  // Generate Prisma Client
  console.log('📦 Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit', cwd: process.cwd() });
  console.log('✅ Prisma Client generated successfully\n');

  // Try migration first, fallback to db push if shadow database fails
  console.log('🔄 Attempting database migration...');
  try {
    execSync('npx prisma migrate dev --name init', { stdio: 'inherit', cwd: process.cwd() });
    console.log('✅ Database migration completed successfully\n');
  } catch (migrationError) {
    console.log('⚠️  Migration failed, trying db push instead...');
    execSync('npx prisma db push', { stdio: 'inherit', cwd: process.cwd() });
    console.log('✅ Database schema pushed successfully\n');
  }

  // Seed the database
  console.log('🌱 Seeding database with sample data...');
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit', cwd: process.cwd() });
  console.log('✅ Database seeded successfully\n');

  console.log('🎉 Database setup completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('Admin: admin@nekomart.com / Admin123!');
  console.log('Seller: seller@nekomart.com / Seller123!');
  console.log('User: user@nekomart.com / User123!');
  console.log('Discord User: discord@nekomart.com (OAuth only)\n');

} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Check your database connection in .env file');
  console.log('2. Ensure your database user has proper permissions');
  console.log('3. Try running: npm run db:push (bypasses shadow database)');
  console.log('4. Contact your database administrator for shadow database permissions\n');
  process.exit(1);
}