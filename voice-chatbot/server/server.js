const express = require('express');
const ngrok = require('ngrok');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const net = require('net');
const cors = require('cors');
require('dotenv').config();  // Load environment variables

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Endpoint for receiving audio files
app.post('/upload-audio', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const audioUrl = `/audio/${req.file.filename}`;
  res.status(200).json({ message: 'File uploaded successfully', audioUrl: audioUrl });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../build')));

// Serve uploaded audio files
app.use('/audio', express.static(path.join(__dirname, 'uploads')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Function to check if the port is in use
function checkPortInUse(port, callback) {
  const tester = net.createServer()
    .once('error', err => (err.code === 'EADDRINUSE' ? callback(true) : callback(false)))
    .once('listening', () => tester.once('close', () => callback(false)).close())
    .listen(port);
}

// Start ngrok
async function startNgrok(port) {
  const ngrokToken = process.env.NGROK_AUTHTOKEN;
  if (!ngrokToken) {
    console.error('NGROK_AUTHTOKEN is not set in the environment variables.');
    return null;
  }

  try {
    await ngrok.authtoken(ngrokToken);
    const url = await ngrok.connect({
      addr: port,
      region: 'us', // or your preferred region
    });
    console.log(`Ngrok tunnel established at: ${url}`);
    console.log(`Use this URL for your Make.com webhook: ${url}/upload-audio`);
    return url;
  } catch (err) {
    console.error('Error while connecting to ngrok:', err);
    return null;
  }
}

// Start the server
checkPortInUse(port, async (isInUse) => {
  if (isInUse) {
    console.log(`Port ${port} is already in use. Please close any other instances.`);
  } else {
    app.listen(port, async () => {
      console.log(`Server running on http://localhost:${port}`);
      
      // Start ngrok after the server is running
      const ngrokUrl = await startNgrok(port);
      if (!ngrokUrl) {
        console.log('Failed to establish ngrok tunnel. The server is still running locally.');
      }
    });
  }
});