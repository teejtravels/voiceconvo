// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { createVADDetector } from '@ricky0123/vad';
import axios from 'axios';

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');

  const startSpeechRecognition = useCallback(() => {
    if (!window.webkitSpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      setTranscript(transcript);
    };

    recognition.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  }, []);

  const initializeVAD = useCallback(async () => {
    try {
      const vad = await createVADDetector();
      
      vad.onSpeechStart(() => {
        console.log('Speech started');
      });
      
      vad.onSpeechEnd(() => {
        console.log('Speech ended');
        // Send transcript to backend
        if (transcript) {
          sendToBackend(transcript);
        }
      });

      return vad;
    } catch (error) {
      setError(`VAD initialization error: ${error.message}`);
      return null;
    }
  }, [transcript]);

  const sendToBackend = async (text) => {
    try {
      const { data } = await axios.post('http://localhost:5000/api/conversation', { text });
      setResponse(data.response);
    } catch (error) {
      setError(`Backend communication error: ${error.message}`);
    }
  };

  const toggleListening = useCallback(async () => {
    if (isListening) {
      // Stop listening
      const recognition = startSpeechRecognition();
      recognition.stop();
    } else {
      // Start listening
      const recognition = startSpeechRecognition();
      const vad = await initializeVAD();
      if (vad) {
        recognition.start();
        vad.start();
      }
    }
  }, [isListening, startSpeechRecognition, initializeVAD]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
        <h1 className="text-2xl font-bold mb-4">Voice Conversation App</h1>
        
        <button
          onClick={toggleListening}
          className={`w-full p-4 rounded-lg mb-4 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white font-semibold`}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h2 className="font-semibold mb-2">Transcript:</h2>
            <div className="bg-gray-50 p-3 rounded">
              {transcript || 'No transcript yet...'}
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Response:</h2>
            <div className="bg-gray-50 p-3 rounded">
              {response || 'No response yet...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;