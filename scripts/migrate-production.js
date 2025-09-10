#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Running production database migration...\n');

try {
  // Generate Prisma Client
  console.log('📦 Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma Client generated\n');

  // Use db push for production (no shadow database required)
  console.log('🔄 Pushing database schema...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log('✅ Database schema updated\n');

  console.log('🎉 Production migration completed successfully!');

} catch (error) {
  console.error('❌ Production migration failed:', error.message);
  process.exit(1);
}