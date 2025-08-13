// Test script to validate Cognito Client ID format
const testClientId = 'q/lbyjLawy2acsxJml+fhyfiHLsWgI9RpnRmA+wi';

console.log('🔍 Testing Client ID format...');
console.log('Current value:', testClientId);
console.log('Length:', testClientId.length);

// Check if it matches AWS Cognito Client ID pattern
const validPattern = /^[\w+]+$/;
const isValid = validPattern.test(testClientId);

console.log('✅ Valid format?', isValid);

if (!isValid) {
  console.log('\n❌ This Client ID is invalid!');
  console.log('❌ Contains invalid characters: /, +, etc.');
  console.log('✅ Valid Client IDs look like: 1234567890abcdef');
  console.log('✅ Or: abcdef1234567890');
  console.log('\n🔧 You need to get the actual Client ID from AWS Cognito Console');
  console.log('🔧 Go to: AWS Console → Cognito → User Pools → App integration → App client list');
} 