// backend/src/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Conversation endpoint
app.post('/api/conversation', async (req, res) => {
  try {
    const { text } = req.body;
    // Here you'll integrate with your chosen language model
    // For now, we'll just echo the text
    res.json({ 
      success: true, 
      response: `Received: ${text}` 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});