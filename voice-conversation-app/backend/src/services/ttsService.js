// backend/src/services/ttsService.js
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

class TTSService {
  constructor(config = {}) {
    this.voicesPath = config.voicesPath || path.join(__dirname, '../voices');
    this.audioPath = config.audioPath || path.join(__dirname, '../audio');
    this.containerName = config.containerName || 'xtts-server';
    this.voiceProfiles = new Map();
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.voicesPath, { recursive: true });
      await fs.mkdir(this.audioPath, { recursive: true });
      await this.loadVoiceProfiles();
    } catch (error) {
      console.error('TTSService initialization failed:', error);
      throw error;
    }
  }

  async loadVoiceProfiles() {
    try {
      const files = await fs.readdir(this.voicesPath);
      for (const file of files) {
        if (file.endsWith('.npz')) {
          const profileId = file.replace('.npz', '');
          const metadata = await this.loadVoiceMetadata(profileId);
          this.voiceProfiles.set(profileId, metadata);
        }
      }
    } catch (error) {
      console.error('Failed to load voice profiles:', error);
    }
  }

  async loadVoiceMetadata(profileId) {
    try {
      const metadataPath = path.join(this.voicesPath, `${profileId}.json`);
      const data = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { id: profileId, name: profileId };
    }
  }

  async createVoiceProfile(audioBuffer, metadata) {
    const profileId = uuidv4();
    try {
      // Save audio sample
      const samplePath = path.join(this.voicesPath, `${profileId}.wav`);
      await fs.writeFile(samplePath, audioBuffer);

      // Generate voice profile using XTTS
      await this.generateProfile(profileId, samplePath);

      // Save metadata
      const profileMetadata = {
        id: profileId,
        name: metadata.name || profileId,
        description: metadata.description,
        created: new Date().toISOString(),
        ...metadata
      };

      await fs.writeFile(
        path.join(this.voicesPath, `${profileId}.json`),
        JSON.stringify(profileMetadata, null, 2)
      );

      this.voiceProfiles.set(profileId, profileMetadata);
      return profileId;
    } catch (error) {
      console.error('Failed to create voice profile:', error);
      throw error;
    }
  }

  async generateProfile(profileId, audioPath) {
    return new Promise((resolve, reject) => {
      const process = spawn('docker', [
        'exec',
        this.containerName,
        'python',
        'generate_voice_profile.py',
        '--audio',
        audioPath,
        '--output',
        `${profileId}.npz`
      ]);

      process.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Profile generation failed with code ${code}`));
      });
    });
  }

  async synthesizeSpeech(text, profileId, options = {}) {
    if (!this.voiceProfiles.has(profileId)) {
      throw new Error('Voice profile not found');
    }

    const outputId = uuidv4();
    const outputPath = path.join(this.audioPath, `${outputId}.wav`);

    return new Promise((resolve, reject) => {
      const process = spawn('docker', [
        'exec',
        this.containerName,
        'python',
        'synthesize.py',
        '--text',
        text,
        '--voice',
        `${profileId}.npz`,
        '--output',
        outputPath,
        '--language',
        options.language || 'en',
        '--speed',
        options.speed || '1.0'
      ]);

      process.on('close', async (code) => {
        if (code === 0) {
          try {
            const audio = await fs.readFile(outputPath);
            await fs.unlink(outputPath); // Cleanup
            resolve(audio);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Speech synthesis failed with code ${code}`));
        }
      });
    });
  }

  async getVoiceProfiles() {
    return Array.from(this.voiceProfiles.values());
  }

  async deleteVoiceProfile(profileId) {
    if (!this.voiceProfiles.has(profileId)) {
      throw new Error('Voice profile not found');
    }

    try {
      await fs.unlink(path.join(this.voicesPath, `${profileId}.npz`));
      await fs.unlink(path.join(this.voicesPath, `${profileId}.json`));
      this.voiceProfiles.delete(profileId);
    } catch (error) {
      console.error('Failed to delete voice profile:', error);
      throw error;
    }
  }
}

module.exports = TTSService;