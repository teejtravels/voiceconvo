import React, { useState } from 'react';
import { ReactMic } from 'react-mic';
import axios from 'axios';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [responseAudioUrl, setResponseAudioUrl] = useState('');

  const startRecording = () => setIsRecording(true);
  const stopRecording = () => setIsRecording(false);

  const onStop = (recordedBlob) => {
    setAudioBlob(recordedBlob.blob);
    sendAudioToWebhook(recordedBlob.blob);
  };

  const sendAudioToWebhook = (audioBlob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    // Replace this URL with the one from your Make.com webhook
    fetch('https://your-make-webhook-url', {
      method: 'POST',
      body: formData,
    })
      .then(response => response.json())
      .then(data => {
        setResponseText(data.transcription);
        setResponseAudioUrl(data.audioUrl);  // Assuming you get an audio URL back
      })
      .catch(error => console.error('Error:', error));
  };

  const playResponseAudio = () => {
    const audio = new Audio(responseAudioUrl);
    audio.play();
  };

  return (
    <div className="App">
      <h1>Voice Chatbot</h1>
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
