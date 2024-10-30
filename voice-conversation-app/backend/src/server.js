const express = require('express');
const cors = require('cors');
const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Initialize Vertex AI with explicit credentials
let vertexAI;
try {
  const credentials = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config/google-credentials.json'))
  );

  vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION,
    googleAuthOptions: {
      credentials: credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT
    }
  });
  console.log('Vertex AI initialized successfully');
} catch (error) {
  console.error('Vertex AI initialization failed:', error);
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Store conversation history (in production, use a proper database)
const conversations = new Map();

// Helper function to manage conversation context
const getOrCreateConversation = (userId) => {
  if (!conversations.has(userId)) {
    conversations.set(userId, {
      history: [],
      userProfile: {
        name: 'User',
        preferences: [],
        memoryTopics: []
      }
    });
  }
  return conversations.get(userId);
};

// System prompt template for memory care companion
const getSystemPrompt = (userProfile) => `
You are a caring, patient, and supportive friend named Sarah. Your role is to engage in natural, 
warm conversations while being mindful that you're speaking with someone who may have memory challenges. 
Key guidelines:

- Maintain a consistent personality as Sarah, a kind and understanding friend
- Speak in a clear, simple, and friendly manner
- Be patient with repetitive questions or topics
- Gently remind of previous conversation points when appropriate
- Show genuine interest in their stories and experiences
- Avoid correcting memory inconsistencies directly
- Focus on emotional support and connection
- Keep responses concise and easy to follow
- Reference shared "memories" from previous conversations naturally

User Profile:
Name: ${userProfile.name}
Important Topics: ${userProfile.memoryTopics.join(', ')}
Preferences: ${userProfile.preferences.join(', ')}

Remember: Your goal is to provide companionship and emotional support while maintaining a natural, 
friendly conversation flow.
`;

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Main conversation endpoint
app.post('/api/conversation', async (req, res) => {
  try {
    console.log('Received request:', req.body);
    const { text, userId = 'default' } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const conversation = getOrCreateConversation(userId);

    const generativeModel = vertexAI.preview.getGenerativeModel({
      model: 'gemini-1.5-flash-002',
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 1,
        topP: 0.95,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'OFF',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'OFF',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'OFF',
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'OFF',
        }
      ],
    });

    const chat = generativeModel.startChat({
      context: getSystemPrompt(conversation.userProfile)
    });

    const streamResult = await chat.sendMessageStream(text);
    const response = await streamResult.response;
    const responseText = response.candidates[0].content.parts[0].text;

    // Update conversation history
    conversation.history.push(
      { role: 'user', content: text },
      { role: 'assistant', content: responseText }
    );

    // Keep history at a reasonable size
    if (conversation.history.length > 20) {
      conversation.history = conversation.history.slice(-20);
    }

    res.json({
      success: true,
      response: responseText,
      conversationId: userId
    });

  } catch (error) {
    console.error('Conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process conversation',
      details: error.message
    });
  }
});

// Profile update endpoint
app.post('/api/user/profile', (req, res) => {
  try {
    console.log('Received profile update:', req.body);
    const { userId, profile } = req.body;
    
    if (!userId || !profile) {
      return res.status(400).json({
        success: false,
        error: 'UserId and profile are required'
      });
    }

    const conversation = getOrCreateConversation(userId);
    conversation.userProfile = {
      ...conversation.userProfile,
      ...profile
    };
    
    res.json({ 
      success: true,
      profile: conversation.userProfile
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: err.message
  });
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log('Available routes:');
  console.log('  GET  /api/health');
  console.log('  POST /api/conversation');
  console.log('  POST /api/user/profile');
  console.log('Environment:');
  console.log('  Project:', process.env.GOOGLE_CLOUD_PROJECT);
  console.log('  Location:', process.env.GOOGLE_CLOUD_LOCATION);
  console.log('  Port:', port);
});