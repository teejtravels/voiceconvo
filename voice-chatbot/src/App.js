import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseAudioUrl, setResponseAudioUrl] = useState('');

  const audioContext = useRef(null);
  const analyser = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  useEffect(() => {
    return () => {
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  const initializeMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      analyser.current = audioContext.current.createAnalyser();
      const source = audioContext.current.createMediaStreamSource(stream);
      source.connect(analyser.current);

      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };
      mediaRecorder.current.onstop = sendAudioToWebhook;

      setIsListening(true);
      detectSound();
    } catch (error) {
      console.error('Error initializing microphone:', error);
    }
  };

  const detectSound = () => {
    if (!isListening) return;

    const bufferLength = analyser.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / bufferLength;

    if (average > 10) {  // Adjust this threshold as needed
      if (!isRecording) {
        startRecording();
      }
    } else {
      if (isRecording) {
        stopRecording();
      }
    }

    requestAnimationFrame(detectSound);
  };

  const startRecording = () => {
    audioChunks.current = [];
    mediaRecorder.current.start();
    setIsRecording(true);
    console.log('Recording started');
  };

  const stopRecording = () => {
    mediaRecorder.current.stop();
    setIsRecording(false);
    console.log('Recording stopped');
  };

  const sendAudioToWebhook = async () => {
    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    try {
      const response = await axios.post('https://your-make-webhook-url', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResponseText(response.data.transcription);
      setResponseAudioUrl(response.data.audioUrl);
    } catch (error) {
      console.error('Error sending audio to webhook:', error);
    }
  };

  const playResponseAudio = () => {
    const audio = new Audio(responseAudioUrl);
    audio.play();
  };

  return (
    <div className="App">
      <h1>Voice Chatbot with VAD and Recording</h1>
      <button onClick={initializeMic} disabled={isListening}>
        {isListening ? 'Mic Initialized' : 'Initialize Mic'}
      </button>
      <p>{isRecording ? 'Recording...' : 'Not recording'}</p>
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