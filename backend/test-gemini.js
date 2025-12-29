// Test script to verify Gemini API with gemini-2.0-flash model
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment');
  process.exit(1);
}

console.log('🔑 GEMINI_API_KEY found:', GEMINI_API_KEY.substring(0, 10) + '...');
console.log('');

// List available models
async function listAvailableModels() {
  console.log('📋 Listing available Gemini models...');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed to list models');
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Available models:');
    data.models
      .filter(m => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))
      .forEach(model => {
        console.log(`  - ${model.name.replace('models/', '')}`);
      });
    console.log('');
  } catch (error) {
    console.error('❌ Error listing models:', error.message);
  }
}

// Test gemini-2.0-flash with v1beta API
async function testGemini20Flash() {
  console.log('📝 Testing gemini-2.0-flash with v1beta API...');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say "Hello, Gemini 2.0 works!" in one sentence.' }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 100,
          },
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ gemini-2.0-flash-exp FAILED');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return false;
    }

    console.log('✅ gemini-2.0-flash-exp WORKS!');
    console.log('Response:', data.candidates[0].content.parts[0].text);
    return true;
  } catch (error) {
    console.error('❌ gemini-2.0-flash-exp ERROR:', error.message);
    return false;
  }
}

// Test gemini-flash-latest (auto-maps to latest free model)
async function testGeminiFlashLatest() {
  console.log('');
  console.log('📝 Testing gemini-flash-latest with v1beta API...');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say "Hello, Gemini Flash works!" in one sentence.' }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 100,
          },
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ gemini-flash-latest FAILED');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return false;
    }

    console.log('✅ gemini-flash-latest WORKS!');
    console.log('Response:', data.candidates[0].content.parts[0].text);
    return true;
  } catch (error) {
    console.error('❌ gemini-flash-latest ERROR:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 GEMINI API TEST SUITE');
  console.log('='.repeat(60));
  console.log('');

  await listAvailableModels();

  const gemini20Works = await testGemini20Flash();
  const geminiFlashWorks = await testGeminiFlashLatest();

  console.log('');
  console.log('='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));
  console.log('gemini-2.0-flash-exp (v1beta):', gemini20Works ? '✅ WORKS' : '❌ FAILED');
  console.log('gemini-flash-latest (v1beta):', geminiFlashWorks ? '✅ WORKS' : '❌ FAILED');
  console.log('');
  
  if (geminiFlashWorks) {
    console.log('💡 RECOMMENDATION: Use gemini-flash-latest with v1beta API');
    console.log('   This auto-maps to the latest available free-tier model');
  } else if (gemini20Works) {
    console.log('💡 RECOMMENDATION: Use gemini-2.0-flash-exp with v1beta API');
    console.log('   Note: Experimental models may have different rate limits');
  } else {
    console.log('⚠️  WARNING: Both models failed. Your API key may not have free-tier access');
    console.log('   Visit https://aistudio.google.com/app/apikey to check your quota');
  }
  console.log('='.repeat(60));
}

runTests().catch(console.error);
