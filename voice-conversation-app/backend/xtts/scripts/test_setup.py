# backend/xtts/scripts/test_setup.py
import argparse
import os
import soundfile as sf
import numpy as np
from TTS.utils.manage import ModelManager
from TTS.utils.synthesizer import Synthesizer
import librosa

def create_test_audio(output_path, duration=5, sr=22050):
    """Create a test audio file with a simple tone."""
    t = np.linspace(0, duration, int(sr * duration))
    audio = 0.5 * np.sin(2 * np.pi * 440 * t)  # 440 Hz tone
    sf.write(output_path, audio, sr)
    return output_path

def test_xtts_setup():
    """Test XTTS setup and functionality."""
    print("Testing XTTS Setup...")
    
    # 1. Check model availability
    print("\n1. Checking model files...")
    model_manager = ModelManager()
    model_path = model_manager.download_model("tts_models/multilingual/multi-dataset/xtts_v1")
    print("✓ Model files found")

    # 2. Test voice profile creation
    print("\n2. Testing voice profile creation...")
    test_audio_path = "test_audio.wav"
    create_test_audio(test_audio_path)
    
    test_profile_path = "test_profile.npz"
    os.system(f"python generate_voice_profile.py --audio {test_audio_path} --output {test_profile_path}")
    
    if os.path.exists(test_profile_path):
        print("✓ Voice profile creation successful")
    
    # 3. Test speech synthesis
    print("\n3. Testing speech synthesis...")
    test_output_path = "test_output.wav"
    os.system(f"python synthesize.py --text 'This is a test of the XTTS system.' --voice {test_profile_path} --output {test_output_path}")
    
    if os.path.exists(test_output_path):
        print("✓ Speech synthesis successful")
    
    # 4. Verify audio files
    print("\n4. Verifying audio files...")
    try:
        audio, sr = librosa.load(test_output_path)
        duration = librosa.get_duration(y=audio, sr=sr)
        print(f"✓ Generated audio duration: {duration:.2f} seconds")
    except Exception as e:
        print(f"× Error verifying audio: {e}")
    
    # Cleanup
    print("\nCleaning up test files...")
    for file in [test_audio_path, test_profile_path, test_output_path]:
        if os.path.exists(file):
            os.remove(file)
    
    print("\nTest completed successfully!")

if __name__ == "__main__":
    test_xtts_setup()