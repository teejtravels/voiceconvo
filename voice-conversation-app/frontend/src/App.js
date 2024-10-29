import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    try {
      if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
        throw new Error('Speech recognition not supported. Please use Chrome browser.');
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      // Configure recognition settings
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // Speech detection events
      recognition.onspeechstart = () => {
        console.log('Speech detected');
        setIsSpeaking(true);
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };

      recognition.onspeechend = () => {
        console.log('Speech ended');
        // Add a small delay before setting isSpeaking to false to handle brief pauses
        timeoutRef.current = setTimeout(() => {
          setIsSpeaking(false);
          // Send the accumulated transcript to backend
          if (transcript.trim()) {
            sendToBackend(transcript);
          }
          // Clear the transcript for the next utterance
          setTranscript('');
        }, 1000);
      };

      recognition.onstart = () => {
        console.log('Recognition started');
        setIsListening(true);
        setError('');
      };

      recognition.onend = () => {
        console.log('Recognition ended');
        // Restart recognition if we're still in listening mode
        if (isListening) {
          console.log('Restarting recognition');
          recognition.start();
        } else {
          setIsListening(false);
        }
      };

      recognition.onresult = (event) => {
        // Accumulate transcripts from all results
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update the transcript with both final and interim results
        setTranscript(finalTranscript || interimTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        
        if (event.error === 'no-speech') {
          // Handle no speech detected
          setIsSpeaking(false);
        } else if (event.error === 'network') {
          setError('Network error occurred. Please check your connection.');
        } else if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access and try again.');
        }
      };

      return recognition;
    } catch (error) {
      console.error('Recognition initialization error:', error);
      setError(error.message);
      return null;
    }
  }, [transcript, isListening]);

// Update sendToBackend function
const sendToBackend = async (text) => {
  try {
    const { data } = await axios.post('http://localhost:5000/api/conversation', {
      text,
      userId: conversationId
    });
    setResponse(data.response);
    // Here you would trigger your custom voice response
    // await playCustomVoiceResponse(data.response);
  } catch (error) {
    console.error('Backend error:', error);
    setError(`Failed to get response: ${error.message}`);
  }
};

  const toggleListening = useCallback(async () => {
    try {
      if (isListening) {
        // Stop listening
        recognitionRef.current?.stop();
        setIsListening(false);
      } else {
        // Request microphone permission before starting
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Initialize and start recognition
        const recognition = initializeSpeechRecognition();
        if (recognition) {
          recognitionRef.current = recognition;
          recognition.start();
        }
      }
    } catch (error) {
      console.error('Toggle listening error:', error);
      if (error.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        setError(`Failed to start listening: ${error.message}`);
      }
    }
  }, [isListening, initializeSpeechRecognition]);

  // adding user profile : 
const [conversationId, setConversationId] = useState('default');
const [userProfile, setUserProfile] = useState({
  name: 'User',
  preferences: [],
  memoryTopics: []
});


// Add function to update user profile
const updateUserProfile = async (profile) => {
  try {
    await axios.post('http://localhost:5000/api/user/profile', {
      userId: conversationId,
      profile
    });
    setUserProfile(profile);
  } catch (error) {
    console.error('Profile update error:', error);
  }
};



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Voice Conversation App</h1>
        
        <div className="flex flex-col space-y-4">
          <button
            onClick={toggleListening}
            className={`
              w-full p-4 rounded-lg text-white font-semibold
              transition-all duration-200 ease-in-out
              ${isListening 
                ? 'bg-red-500 hover:bg-red-600 active:bg-red-700' 
                : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'}
            `}
          >
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>

          <div className={`text-center p-2 rounded-lg ${
            isSpeaking ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            Status: {isSpeaking ? 'Speaking Detected' : isListening ? 'Listening...' : 'Not Listening'}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6 mt-4">
          <div className="bg-gray-50 rounded-lg p-4 shadow-inner">
            <h2 className="font-semibold text-gray-700 mb-2">Current Transcript</h2>
            <p className="text-gray-600 min-h-[2rem]">
              {transcript || 'Waiting for speech...'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 shadow-inner">
            <h2 className="font-semibold text-gray-700 mb-2">Response</h2>
            <p className="text-gray-600 min-h-[2rem]">
              {response || 'Waiting for response...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;