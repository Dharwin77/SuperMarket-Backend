// Test Ollama Connection
console.log('🔍 Testing Ollama connection...\n');

async function testOllama() {
  try {
    // Test 1: Check if Ollama is running
    console.log('Test 1: Checking if Ollama service is running...');
    const tagsResponse = await fetch('http://localhost:11434/api/tags');
    
    if (!tagsResponse.ok) {
      throw new Error(`HTTP error! status: ${tagsResponse.status}`);
    }
    
    const data = await tagsResponse.json();
    console.log('✅ Ollama is running!');
    console.log(`📦 Available models: ${data.models?.length || 0}\n`);
    
    if (data.models && data.models.length > 0) {
      console.log('Models installed:');
      data.models.forEach(model => {
        console.log(`  - ${model.name} (${(model.size / 1024 / 1024 / 1024).toFixed(2)} GB)`);
      });
      console.log('');
      
      // Test 2: Try to generate a simple response
      console.log('Test 2: Testing model generation...');
      
      // Prefer modern text models first, then fall back to any non-vision model.
      const preferredTextModels = ['llama3.2', 'llama3.1', 'llama3', 'qwen2.5', 'mistral'];
      const textModel =
        data.models.find(m => preferredTextModels.some(name => m.name.toLowerCase().includes(name))) ||
        data.models.find(m => !m.name.toLowerCase().includes('llava') && !m.name.toLowerCase().includes('vision')) ||
        data.models[0];
      const modelName = textModel.name;
      console.log(`Using model: ${modelName}`);
      
      const generateResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt: 'Say hello in one short sentence.',
          stream: false
        })
      });
      
      if (generateResponse.ok) {
        const result = await generateResponse.json();
        console.log('✅ Model response received!');
        console.log(`Response: ${result.response}\n`);
        console.log('🎉 Ollama is working perfectly!\n');
      } else {
        console.log('⚠️ Model generation failed');
        console.log(`Status: ${generateResponse.status}`);
        const errorText = await generateResponse.text();
        console.log(`Error: ${errorText}\n`);
      }
    } else {
      console.log('⚠️ No models installed!');
      console.log('💡 Install a text model with: ollama pull llama3.2:latest');
      console.log('💡 Or for vision: ollama pull llava:latest\n');
    }
    
  } catch (error) {
    console.error('❌ Ollama test failed:');
    if (error.message.includes('fetch failed') || error.cause?.code === 'ECONNREFUSED') {
      console.error('   Ollama is not running or not accessible at http://localhost:11434');
      console.error('\n💡 To fix this:');
      console.error('   1. Download Ollama from: https://ollama.ai');
      console.error('   2. Install and start Ollama');
      console.error('   3. Run: ollama pull llama3.2:latest');
    } else {
      console.error('   Error:', error.message);
    }
  }
}

testOllama();
