import React, { useState, useEffect } from 'react';
import { ReactMic } from 'react-18-mic';
import axios from 'axios';
import VAD from 'vad';  // Import vad.js

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [responseAudioUrl, setResponseAudioUrl] = useState('');
  const [audioContext, setAudioContext] = useState(null);
  const [stream, setStream] = useState(null);
  const [vadInstance, setVadInstance] = useState(null);

  useEffect(() => {
    const vad = new VAD({
      onVoiceStart: () => {
        console.log('Speech detected');
        startRecording();
      },
      onVoiceStop: () => {
        console.log('Silence detected');
        stopRecording();
      }
    });
    setVadInstance(vad);

    return () => {
      if (vadInstance) vadInstance.destroy();
    };
  }, [audioContext, stream, vadInstance]);

  const initializeMic = async () => {
    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setStream(micStream);
    setAudioContext(new AudioContext());
  };

  const startRecording = () => setIsRecording(true);
  const stopRecording = () => setIsRecording(false);

  const onStop = (recordedBlob) => {
    setAudioBlob(recordedBlob.blob);
    sendAudioToWebhook(recordedBlob.blob);
  };

  const sendAudioToWebhook = (audioBlob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    fetch('https://your-make-webhook-url', {
      method: 'POST',
      body: formData,
    })
      .then(response => response.json())
      .then(data => {
        setResponseText(data.transcription);
        setResponseAudioUrl(data.audioUrl);
      })
      .catch(error => console.error('Error:', error));
  };

  const playResponseAudio = () => {
    const audio = new Audio(responseAudioUrl);
    audio.play();
  };

  return (
    <div className="App">
      <h1>Voice Chatbot with VAD</h1>
      <button onClick={initializeMic}>Initialize Mic</button>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      <ReactMic
        record={isRecording}
        onStop={onStop}
        mimeType="audio/webm"
        strokeColor="#000000"
        backgroundColor="#FF4081"
      />
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
