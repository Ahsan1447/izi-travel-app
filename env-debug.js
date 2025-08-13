// Debug script to check environment variables
// Run this with: node env-debug.js

console.log('🔍 Environment Variables Debug');
console.log('==============================');

const requiredVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID', 
  'AWS_SECRET_ACCESS_KEY',
  'COGNITO_CLIENT_ID',
  'COGNITO_PRO_CLIENT_ID',
  'COGNITO_CLIENT_SECRET'
];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName.includes('SECRET') || varName.includes('KEY')) {
      console.log(`✅ ${varName}: ${value.substring(0, 8)}...`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: Missing`);
  }
});

console.log('\n📝 To set these variables, create a .env.local file with:');
console.log('AWS_REGION=your-region');
console.log('AWS_ACCESS_KEY_ID=your-access-key');
console.log('AWS_SECRET_ACCESS_KEY=your-secret-key');
console.log('COGNITO_CLIENT_ID=your-client-id');
console.log('COGNITO_PRO_CLIENT_ID=your-production-client-id');
console.log('COGNITO_CLIENT_SECRET=your-production-client-secret'); 