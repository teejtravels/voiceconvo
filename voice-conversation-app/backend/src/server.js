const express = require('express');
const cors = require('cors');
const { VertexAI } = require('@google-cloud/vertexai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Initialize Vertex AI
const vertex = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION,
});
const model = 'chat-bison@002';

// Middleware
app.use(cors());
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

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Voice Conversation API is running' });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Main conversation endpoint
app.post('/api/conversation', async (req, res) => {
  try {
    console.log('Received request:', req.body); // Debug log
    const { text, userId = 'default' } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    // If Vertex AI is not configured, return echo response for testing
    if (!process.env.GOOGLE_CLOUD_PROJECT) {
      console.log('Vertex AI not configured, using echo response');
      return res.json({
        success: true,
        response: `Echo: ${text}`,
        conversationId: userId
      });
    }

    const conversation = getOrCreateConversation(userId);

    // Initialize the chat model
    const generativeModel = vertex.preview.getGenerativeModel({
      model: model,
      generation_config: {
        max_output_tokens: 256,
        temperature: 0.7,
        top_p: 0.8,
        top_k: 40
      },
      safety_settings: [
        {
          category: 'HARM_CATEGORY_DANGEROUS',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    });

    // Prepare chat history
    const messageHistory = conversation.history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add system prompt and current message
    const chat = generativeModel.startChat({
      context: getSystemPrompt(conversation.userProfile),
      examples: [
        {
          input: "I can't remember what we talked about last time.",
          output: "That's okay! We were chatting about your garden and those beautiful roses you planted. Would you like to tell me more about your garden?"
        }
      ],
      messages: messageHistory
    });

    // Generate response
    const result = await chat.sendMessage(text);
    const response = result.response;

    // Update conversation history
    conversation.history.push(
      { role: 'user', content: text },
      { role: 'assistant', content: response.text() }
    );

    // Keep history at a reasonable size
    if (conversation.history.length > 20) {
      conversation.history = conversation.history.slice(-20);
    }

    res.json({
      success: true,
      response: response.text(),
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

app.post('/api/user/profile', (req, res) => {
  try {
    console.log('Received profile update:', req.body); // Debug log
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

// Start server with detailed logging
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log('Available routes:');
  console.log('  GET  /');
  console.log('  GET  /api/health');
  console.log('  POST /api/conversation');
  console.log('  POST /api/user/profile');
  console.log('Environment:');
  console.log('  Vertex AI:', process.env.GOOGLE_CLOUD_PROJECT ? 'Configured' : 'Not configured');
  console.log('  Port:', port);
});