const {VertexAI} = require('@google-cloud/vertexai');
const fs = require('fs');
const path = require('path');

async function testSimple() {
  try {
    // Load credentials from file
    const credentials = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../config/google-credentials.json'))
    );

    const vertexAI = new VertexAI({
      project: 'voiceconvo',
      location: 'us-central1',
      googleAuthOptions: {
        credentials: credentials,
        projectId: 'voiceconvo'
      }
    });

    const model = 'gemini-1.5-flash-002';
    const generativeModel = vertexAI.preview.getGenerativeModel({
      model: model,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 1,
        topP: 0.95,
      }
    });

    const chat = generativeModel.startChat({});
    console.log('Sending test message...');
    const message = 'Hello, introduce yourself as Sarah, a friendly AI companion';
    const streamResult = await chat.sendMessageStream(message);
    const response = await streamResult.response;
    console.log('Response:', response.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error('Error:', {
      message: error.message,
      stack: error.stack
    });
  }
}

testSimple();