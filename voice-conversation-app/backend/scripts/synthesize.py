
import argparse
import numpy as np
import torch
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts
import soundfile as sf

def synthesize_speech(text, voice_profile_path, output_path):
    """Synthesize speech using a voice profile."""
    try:
        # Load the model
        config = XttsConfig()
        config.load_json("config.json")
        model = Xtts.init_from_config(config)
        model.load_checkpoint(config, "model.pth")
        
        # Load voice profile
        profile = np.load(voice_profile_path)
        speaker_embedding = torch.FloatTensor(profile['embedding'])
        
        # Generate speech
        with torch.no_grad():
            wav = model.synthesize(
                text,
                speaker_embedding,
                config,
                use_griffin_lim=True  # Faster synthesis for real-time
            )
            
        # Save audio
        sf.write(output_path, wav, profile['sample_rate'])
        return True
    except Exception as e:
        print(f"Error synthesizing speech: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True, help="Text to synthesize")
    parser.add_argument("--voice", required=True, help="Path to voice profile")
    parser.add_argument("--output", required=True, help="Path to save audio")
    args = parser.parse_args()
    
    success = synthesize_speech(args.text, args.voice, args.output)
    exit(0 if success else 1)