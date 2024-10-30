# backend/scripts/generate_voice_profile.py
import argparse
import numpy as np
import torch
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts
import librosa

def generate_voice_profile(audio_path, output_path, sample_rate=22050):
    """Generate a voice profile from an audio sample."""
    try:
        # Load the model
        config = XttsConfig()
        config.load_json("config.json")
        model = Xtts.init_from_config(config)
        model.load_checkpoint(config, "model.pth")
        
        # Load and preprocess audio
        audio, _ = librosa.load(audio_path, sr=sample_rate)
        
        # Extract speaker embedding
        with torch.no_grad():
            speaker_embedding = model.speaker_encoder(torch.FloatTensor(audio).unsqueeze(0))
            
        # Save the profile
        np.savez(output_path, 
                 embedding=speaker_embedding.cpu().numpy(),
                 sample_rate=sample_rate)
        
        return True
    except Exception as e:
        print(f"Error generating voice profile: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True, help="Path to the input audio file")
    parser.add_argument("--output", required=True, help="Path to save the voice profile")
    args = parser.parse_args()
    
    success = generate_voice_profile(args.audio, args.output)
    exit(0 if success else 1)