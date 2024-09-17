import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [responseAudioUrl, setResponseAudioUrl] = useState('');
  const audioRef = useRef(null)
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setRecognizedText(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.log('Speech recognition not supported');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (responseAudioUrl) {
      audioRef.current.src = responseAudioUrl;
      audioRef.current.play().catch(error => console.error('Audio playback error:', error));
    }
  }, [responseAudioUrl]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current.stop();
      sendTextToLLM(recognizedText);
    } else {
      setRecognizedText('');
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
  }, [isListening, recognizedText]);

  const sendTextToLLM = async (text) => {
    try {
      const response = await axios.post(
        'https://hook.us2.make.com/qovbee1r63m1i3imuupp9ujiaij5z3yd',
        { text },
        {
          headers:{
            'content-type': 'application/json',
          },
        }
      );
      setResponseText(response.data.responseText);
      setResponseAudioUrl(response.data.audioUrl);
    } catch (error) {
      console.error('Error sending text to LLM:', error);
      alert('Failed to process text.');
    }
  };
// this might be duplicated
  const playResponseAudio = useCallback(() => {
    if (responseAudioUrl) {
      const audio = new Audio(responseAudioUrl);
      audio.play();
    }
  }, [responseAudioUrl]);

  return (
    <div className="App">
      <h1>Speech-to-Text Chatbot</h1>
      <button onClick={toggleListening}>
        {isListening ? 'Stop Listening' : 'Start Listening'}
      </button>
      <p>Recognized Text: {recognizedText}</p>
      <div>
        {responseText && <p>Chatbot Response: {responseText}</p>}
        {responseAudioUrl && (
          <button onClick={playResponseAudio}>Play Response</button>
        )}
      </div>
    </div>
  );
}

export default App;