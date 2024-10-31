# backend/xtts/scripts/test_voice.py
import os
from TTS.api import TTS
import sys
import torch

def test_voice_clone():
    try:
        print("1. Initializing TTS with YourTTS model...")
        tts = TTS(model_name="tts_models/multilingual/multi-dataset/your_tts")
        print("✓ TTS initialized")

        input_file = "/app/voices/test_audio.wav"
        output_file = "/app/audio/test_output.wav"
        
        print(f"\n2. Checking input file: {input_file}")
        if not os.path.exists(input_file):
            print("× Input file not found!")
            return False
        print("✓ Input file found")

        print("\n3. Generating speech with voice cloning...")
        # Using the simplified API for voice cloning
        tts.tts_to_file(
            text="Hello, this is a test of voice cloning. I hope this sounds like me.",
            file_path=output_file,
            speaker_wav=input_file,
            language="en"
        )

        if os.path.exists(output_file):
            print(f"✓ Speech generated successfully and saved to {output_file}")
            
            # Get the generated speaker embedding
            print("\n4. Extracting speaker embedding...")
            speaker_embedding = tts.synthesizer.tts_model.speaker_encoder.forward(
                tts.synthesizer.tts_model.audio_processor.load_wav(input_file, sr=tts.synthesizer.output_sample_rate)
            )
            
            # Save the speaker embedding
            embedding_file = "/app/voices/speaker_embedding.pt"
            torch.save(speaker_embedding, embedding_file)
            print(f"✓ Speaker embedding saved to {embedding_file}")
            
            return True
        else:
            print("× Failed to generate speech")
            return False

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_saved_embedding():
    try:
        print("\nTesting saved embedding...")
        embedding_file = "/app/voices/speaker_embedding.pt"
        
        if not os.path.exists(embedding_file):
            print("× Saved embedding not found")
            return False
            
        embedding = torch.load(embedding_file)
        print(f"✓ Successfully loaded speaker embedding: Shape {embedding.shape}")
        return True
        
    except Exception as e:
        print(f"Error testing embedding: {str(e)}")
        return False

if __name__ == "__main__":
    print("Starting voice cloning test...")
    success = test_voice_clone()
    if success:
        embedding_test = test_saved_embedding()
    sys.exit(0 if success else 1)