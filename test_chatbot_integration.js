/**
 * Test script to verify chatbot integration
 * This tests the core functionality without needing the React app to run
 */

const https = require('https');

// Test OpenRouter API connection
async function testOpenRouterAPI() {
  console.log('🤖 Testing OpenRouter API connection...');
  
  const apiKey = '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';
  
  const data = JSON.stringify({
    model: 'nousresearch/nous-capybara-7b:free',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant for a cab booking application.'
      },
      {
        role: 'user',
        content: 'How do I book a ride?'
      }
    ],
    max_tokens: 100,
    temperature: 0.7
  });

  const options = {
    hostname: 'openrouter.ai',
    port: 443,
    path: '/api/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'Cab Bidding App Test'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseBody);
          if (res.statusCode === 200 && response.choices && response.choices[0]) {
            console.log('✅ OpenRouter API connection successful!');
            console.log('🤖 Bot response:', response.choices[0].message.content);
            resolve(response);
          } else {
            console.log('❌ OpenRouter API error:', res.statusCode, responseBody);
            reject(new Error(`API Error: ${res.statusCode}`));
          }
        } catch (error) {
          console.log('❌ Failed to parse response:', error.message);
          console.log('Raw response:', responseBody);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Request error:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Test environment variables (simulated for Node.js)
function testEnvironmentSetup() {
  console.log('🔧 Testing environment setup...');
  
  // Check if .env file exists and contains the API key
  const fs = require('fs');
  const path = require('path');
  
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('REACT_APP_OPENROUTER_API_KEY')) {
      console.log('✅ Environment variable configured in .env file');
    } else {
      console.log('❌ OpenRouter API key not found in .env file');
      return false;
    }
    
    if (envContent.includes('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')) {
      console.log('✅ API key value is present');
    } else {
      console.log('❌ Expected API key value not found');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ Error reading .env file:', error.message);
    return false;
  }
}

// Test React component files exist
function testComponentFiles() {
  console.log('📁 Testing component files...');
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    'src/components/Chatbot.js',
    'src/components/Chatbot.css',
    'src/utils/chatbotService.js'
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Chatbot Integration Tests...\n');
  
  let passed = 0;
  let total = 3;
  
  // Test 1: Environment Setup
  if (testEnvironmentSetup()) {
    passed++;
  }
  console.log('');
  
  // Test 2: Component Files
  if (testComponentFiles()) {
    passed++;
  }
  console.log('');
  
  // Test 3: API Connection
  try {
    await testOpenRouterAPI();
    passed++;
  } catch (error) {
    console.log('❌ API test failed:', error.message);
  }
  console.log('');
  
  // Summary
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Chatbot integration is ready!');
    console.log('');
    console.log('🚀 To test the chatbot in the app:');
    console.log('1. Run: npm start');
    console.log('2. Open http://localhost:3001');
    console.log('3. Look for the chat bubble in the bottom right corner');
    console.log('4. Try asking: "How do I book a ride?"');
  } else {
    console.log('⚠️  Some tests failed. Please check the issues above.');
  }
}

runTests().catch(error => {
  console.log('💥 Test runner error:', error.message);
});
