const axios = require('axios');
require('dotenv').config();

// Test SMS sending
async function testSMS() {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const phoneNumber = '8072126400'; // 10 digits without country code
  const message = 'hi dharwin';

  console.log('🧪 Testing Fast2SMS...');
  console.log('📱 Phone:', phoneNumber);
  console.log('💬 Message:', message);
  console.log('🔑 API Key:', apiKey ? 'Loaded ✅' : 'Missing ❌');
  console.log('\n⏳ Sending SMS...\n');

  if (!apiKey) {
    console.error('❌ FAST2SMS_API_KEY not found in .env file');
    process.exit(1);
  }

  try {
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'q',
      message: message,
      language: 'english',
      flash: 0,
      numbers: phoneNumber
    }, {
      headers: {
        'authorization': apiKey
      }
    });

    console.log('✅ SUCCESS! SMS Sent');
    console.log('\n📊 Response from Fast2SMS:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n🎉 Check your phone: +91' + phoneNumber);

  } catch (error) {
    console.error('\n❌ ERROR sending SMS:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('\n💡 Common issues:');
      console.error('   - Invalid API key');
      console.error('   - Insufficient credits');
      console.error('   - API key not activated');
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

testSMS();
