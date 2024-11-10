import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';

// Config for backend URL
const getBackendUrl = () => {
  const codespaceUrl = window.location.hostname;
  return `https://${codespaceUrl.replace('-3000', '-5000')}`;
};

const API_URL = getBackendUrl();


// This adds the companion avatar
const CompanionAvatar = ({ 
  photoUrl, 
  name, 
  isSpeaking, 
  isListening,
  onPhotoUpload 
}) => {
  const [uploadedPhoto, setUploadedPhoto] = useState(photoUrl);
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // In production, you'd upload to your storage service here
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedPhoto(reader.result);
        if (onPhotoUpload) {
          onPhotoUpload(file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 mb-8">
      {/* Avatar container with speaking animation */}
      <div className={`
        relative w-48 h-48 rounded-full 
        ${isSpeaking ? 'animate-pulse' : ''}
        transition-all duration-300
      `}>
        {/* Glowing background when speaking */}
        <div className={`
          absolute inset-0 rounded-full 
          ${isSpeaking ? 'bg-green-400 opacity-50' : 'bg-transparent opacity-0'}
          transition-all duration-300 blur-md
        `} />
        
        {/* Photo upload button and preview */}
        <div className="relative w-full h-full rounded-full overflow-hidden group">
          <img 
            src={uploadedPhoto || "/api/placeholder/192/192"} 
            alt={name} 
            className="w-full h-full object-cover rounded-full"
          />
          
          {/* Upload overlay */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black bg-opacity-50 opacity-0 
                       group-hover:opacity-100 transition-opacity duration-200 
                       flex items-center justify-center cursor-pointer"
          >
            <span className="text-white text-sm">Change Photo</span>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Speaking/Listening indicator */}
        <div className={`
          absolute bottom-2 right-2 w-4 h-4 rounded-full
          transition-all duration-300
          ${isSpeaking ? 'bg-green-500' : 
            isListening ? 'bg-blue-500' : 'bg-gray-400'}
        `} />
      </div>

      {/* Companion name */}
      <h2 className="text-xl font-semibold text-gray-800">{name}</h2>
    </div>
  );
};

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [conversationId] = useState('default');
  const [userProfile, setUserProfile] = useState({
    name: 'User',
    preferences: [],
    memoryTopics: []
  });
  
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  const transcriptRef = useRef('');
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };


  const sendToBackend = async (text) => {
    try {
      console.log('Attempting to send to backend:', text);
      if (!text?.trim()) {
        console.log('Empty text, skipping backend call');
        return;
      }

      console.log(`Sending POST request to ${API_URL}/api/conversation`);
      
      // Initialize audio context on user interaction
      initAudioContext();

      // Make request with responseType 'arraybuffer' for audio streaming
      const response = await axios({
        method: 'post',
        url: `${API_URL}/api/conversation`,
        data: {
          text: text.trim(),
          userId: conversationId
        },
        responseType: 'arraybuffer'
      });

      // Play the audio stream
      const audioData = response.data;
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
      
      if (audioSourceRef.current) {
        audioSourceRef.current.disconnect();
      }

      audioSourceRef.current = audioContextRef.current.createBufferSource();
      audioSourceRef.current.buffer = audioBuffer;
      audioSourceRef.current.connect(audioContextRef.current.destination);
      
      audioSourceRef.current.onended = () => {
        setIsPlaying(false);
      };

      setIsPlaying(true);
      audioSourceRef.current.start(0);

    } catch (error) {
      console.error('Backend communication error:', error);
      setError(`Failed to get response: ${error.message}`);
      console.log('Full error object:', error);
    }
  };

  const updateUserProfile = async (profile) => {
    try {
      const response = await axios.post(`${API_URL}/api/user/profile`, {
        userId: conversationId,
        profile
      });
      console.log('Profile update response:', response.data);
      setUserProfile(profile);
    } catch (error) {
      console.error('Profile update error:', error);
      setError(`Failed to update profile: ${error.message}`);
    }
  };

  const initializeSpeechRecognition = useCallback(() => {
    try {
      if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
        throw new Error('Speech recognition not supported. Please use Chrome browser.');
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onspeechstart = () => {
        console.log('Speech detected');
        setIsSpeaking(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };

      recognition.onspeechend = () => {
        console.log('Speech ended, current transcript:', transcriptRef.current);
        timeoutRef.current = setTimeout(async () => {
          setIsSpeaking(false);
          const currentTranscript = transcriptRef.current;
          if (currentTranscript?.trim()) {
            console.log('Sending transcript:', currentTranscript);
            await sendToBackend(currentTranscript.trim());
          } else {
            console.log('No transcript to send');
          }
          transcriptRef.current = ''; // Clear transcript after sending
        }, 1000);
      };

      recognition.onstart = () => {
        console.log('Recognition started');
        setIsListening(true);
        setError('');
        transcriptRef.current = ''; // Clear transcript at start
      };

      recognition.onend = () => {
        console.log('Recognition ended');
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        console.log('Recognition result received:', event);
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            console.log('Final transcript:', transcript);
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        if (currentTranscript) {
          console.log('Setting transcript:', currentTranscript);
          setTranscript(currentTranscript);
          transcriptRef.current = currentTranscript;
        }
      };

      recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        
        if (event.error === 'no-speech') {
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
  }, []);

  const toggleListening = useCallback(async () => {
    try {
      if (isListening) {
        console.log('Stopping recognition');
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        setIsListening(false);
      } else {
        console.log('Starting recognition');
        await navigator.mediaDevices.getUserMedia({ audio: true });
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

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (audioSourceRef.current) {
        audioSourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
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
            isSpeaking ? 'bg-green-100 text-green-800' : 
            isPlaying ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-600'
          }`}>
            Status: {
              isPlaying ? 'Playing Response' :
              isSpeaking ? 'Speaking Detected' : 
              isListening ? 'Listening...' : 
              'Not Listening'
            }
          </div>
        </div>

        {/* [Rest of the JSX remains the same] */}
      </div>
    </div>
  );
};

export default App;
