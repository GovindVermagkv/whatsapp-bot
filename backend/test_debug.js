const axios = require('axios');

async function checkServer() {
  console.log('🔍 Starting Server Diagnostics...');
  const baseUrl = 'http://localhost:5000';

  // 1. Check Health
  try {
    const health = await axios.get(`${baseUrl}/api/health`);
    console.log('✅ Health Check Path Passed:', health.data);
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
  }

  // 2. Check Status
  try {
    const status = await axios.get(`${baseUrl}/api/status`);
    console.log('✅ WhatsApp Status:', status.data);
  } catch (error) {
    console.error('❌ Status Check Failed:', error.message);
  }

  // 3. Test Invalid Number (Should NOT crash server now)
  try {
    console.log('🧪 Testing Send Message with Invalid Number...');
    await axios.post(`${baseUrl}/api/send-test-message`, {
      number: '123', // Invalid
      message: 'Test'
    });
    console.log('✅ Invalid number request handled (might return success or failure which is expected)');
  } catch (error) {
     if (error.response) {
       console.log(`✅ Server responded with error ${error.response.status} (Expected behavior for invalid input)`);
       console.log('Error data:', error.response.data);
     } else {
       console.error('❌ Server Connection Failed during test message:', error.message);
     }
  }
}

checkServer();
