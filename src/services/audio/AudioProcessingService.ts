import { EventEmitter } from 'events';
import { EmotionalResponse } from '@/types/emotions';
import { AudioFeatures, AudioAnalysisResult } from '@/types/audio';

interface AudioProcessingConfig {
  sampleRate: number;
  channels: number;
  encoding: 'LINEAR16' | 'FLAC' | 'MULAW' | 'AMR' | 'AMR_WB';
  languageCode: string;
}

@singleton()
export class AudioProcessingService extends EventEmitter {
  private static instance: AudioProcessingService;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isProcessing: boolean = false;
  private readonly defaultConfig: AudioProcessingConfig = {
    sampleRate: 16000,
    channels: 1,
    encoding: 'LINEAR16',
    languageCode: 'en-US'
  };

  private constructor() {
    super();
    if (typeof window !== 'undefined') {
      this.audioContext = new AudioContext();
    }
  }

  public static getInstance(): AudioProcessingService {
    if (!AudioProcessingService.instance) {
      AudioProcessingService.instance = new AudioProcessingService();
    }
    return AudioProcessingService.instance;
  }

  async startRecording(): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.emit('recordingStarted');
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        this.emit('recordingStopped', audioUrl);
        
        // Process the recorded audio
        if (!this.isProcessing) {
          await this.processAudio(audioBlob);
        }
      };

      this.mediaRecorder.start(100); // Collect data in 100ms chunks
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  async processAudio(audioBlob: Blob): Promise<AudioAnalysisResult> {
    this.isProcessing = true;
    try {
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      
      // Extract audio features
      const features = await this.extractAudioFeatures(audioBuffer);
      
      // Analyze emotional content
      const emotionalContent = await this.analyzeEmotionalContent(features);
      
      // Analyze speech patterns
      const speechPatterns = await this.analyzeSpeechPatterns(features);
      
      const result: AudioAnalysisResult = {
        features,
        emotionalContent,
        speechPatterns,
        timestamp: new Date(),
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate
      };

      this.emit('analysisComplete', result);
      return result;
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  private async extractAudioFeatures(audioBuffer: AudioBuffer): Promise<AudioFeatures> {
    const channelData = audioBuffer.getChannelData(0);
    const features: AudioFeatures = {
      pitch: await this.calculatePitch(channelData),
      volume: this.calculateVolume(channelData),
      tempo: await this.calculateTempo(channelData),
      spectralFeatures: await this.calculateSpectralFeatures(channelData),
      mfcc: await this.calculateMFCC(channelData)
    };
    return features;
  }

  private async calculatePitch(channelData: Float32Array): Promise<number> {
    // Implement pitch detection algorithm (e.g., autocorrelation)
    const correlations = new Float32Array(channelData.length);
    let maxCorrelation = 0;
    let pitch = 0;

    // Simple autocorrelation implementation
    for (let lag = 0; lag < correlations.length; lag++) {
      let correlation = 0;
      for (let i = 0; i < correlations.length - lag; i++) {
        correlation += channelData[i] * channelData[i + lag];
      }
      correlations[lag] = correlation;
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        pitch = lag;
      }
    }

    return this.audioContext!.sampleRate / pitch;
  }

  private calculateVolume(channelData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    return Math.sqrt(sum / channelData.length);
  }

  private async calculateTempo(channelData: Float32Array): Promise<number> {
    // Implement tempo detection algorithm (e.g., onset detection)
    const onsets = await this.detectOnsets(channelData);
    const intervalCounts: { [key: number]: number } = {};
    
    for (let i = 1; i < onsets.length; i++) {
      const interval = onsets[i] - onsets[i - 1];
      intervalCounts[interval] = (intervalCounts[interval] || 0) + 1;
    }
    
    const mostCommonInterval = Object.entries(intervalCounts)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];
    
    return 60 / (Number(mostCommonInterval) / this.audioContext!.sampleRate);
  }

  private async detectOnsets(channelData: Float32Array): Promise<number[]> {
    const onsets: number[] = [];
    const windowSize = 1024;
    const threshold = 0.1;
    
    for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
      const window = channelData.slice(i, i + windowSize);
      const energy = this.calculateVolume(window);
      
      if (energy > threshold) {
        onsets.push(i);
      }
    }
    
    return onsets;
  }

  private async calculateSpectralFeatures(channelData: Float32Array): Promise<{
    centroid: number;
    rolloff: number;
    flux: number;
  }> {
    const fft = await this.computeFFT(channelData);
    const magnitudes = new Float32Array(fft.length / 2);
    
    for (let i = 0; i < magnitudes.length; i++) {
      magnitudes[i] = Math.sqrt(fft[i * 2] * fft[i * 2] + fft[i * 2 + 1] * fft[i * 2 + 1]);
    }
    
    return {
      centroid: this.calculateSpectralCentroid(magnitudes),
      rolloff: this.calculateSpectralRolloff(magnitudes),
      flux: this.calculateSpectralFlux(magnitudes)
    };
  }

  private async computeFFT(channelData: Float32Array): Promise<Float32Array> {
    // Use Web Audio API's AnalyserNode for FFT computation
    const analyser = this.audioContext!.createAnalyser();
    const source = this.audioContext!.createBufferSource();
    const buffer = this.audioContext!.createBuffer(1, channelData.length, this.audioContext!.sampleRate);
    
    buffer.getChannelData(0).set(channelData);
    source.buffer = buffer;
    source.connect(analyser);
    
    const fftSize = 2048;
    analyser.fftSize = fftSize;
    const fftData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(fftData);
    
    return fftData;
  }

  private calculateSpectralCentroid(magnitudes: Float32Array): number {
    let weightedSum = 0;
    let sum = 0;
    
    for (let i = 0; i < magnitudes.length; i++) {
      weightedSum += i * magnitudes[i];
      sum += magnitudes[i];
    }
    
    return weightedSum / sum;
  }

  private calculateSpectralRolloff(magnitudes: Float32Array): number {
    const totalEnergy = magnitudes.reduce((sum, mag) => sum + mag, 0);
    let cumulativeEnergy = 0;
    
    for (let i = 0; i < magnitudes.length; i++) {
      cumulativeEnergy += magnitudes[i];
      if (cumulativeEnergy >= 0.85 * totalEnergy) { // 85% rolloff point
        return i / magnitudes.length;
      }
    }
    
    return 1;
  }

  private calculateSpectralFlux(magnitudes: Float32Array): number {
    let flux = 0;
    
    for (let i = 1; i < magnitudes.length; i++) {
      const diff = magnitudes[i] - magnitudes[i - 1];
      flux += diff * diff;
    }
    
    return Math.sqrt(flux);
  }

  private async calculateMFCC(channelData: Float32Array): Promise<Float32Array> {
    // Implement Mel-frequency cepstral coefficients calculation
    const fft = await this.computeFFT(channelData);
    const melFilterbank = this.createMelFilterbank(fft.length, this.audioContext!.sampleRate);
    const melSpectrum = this.applyMelFilterbank(fft, melFilterbank);
    return this.computeDCT(melSpectrum);
  }

  private createMelFilterbank(fftSize: number, sampleRate: number): Float32Array[] {
    // Create mel-scale filterbank
    const filters: Float32Array[] = [];
    const melMin = 0;
    const melMax = 2595 * Math.log10(1 + sampleRate / 2 / 700);
    const numFilters = 26;
    
    for (let i = 0; i < numFilters; i++) {
      const filter = new Float32Array(fftSize);
      const melCenter = melMin + (melMax - melMin) * (i + 1) / (numFilters + 1);
      const freqCenter = 700 * (Math.pow(10, melCenter / 2595) - 1);
      
      for (let j = 0; j < fftSize; j++) {
        const freq = j * sampleRate / fftSize;
        const mel = 2595 * Math.log10(1 + freq / 700);
        filter[j] = Math.max(0, 1 - Math.abs(mel - melCenter) / (melMax / numFilters));
      }
      
      filters.push(filter);
    }
    
    return filters;
  }

  private applyMelFilterbank(fft: Float32Array, filterbank: Float32Array[]): Float32Array {
    const melSpectrum = new Float32Array(filterbank.length);
    
    for (let i = 0; i < filterbank.length; i++) {
      let sum = 0;
      for (let j = 0; j < fft.length; j++) {
        sum += fft[j] * filterbank[i][j];
      }
      melSpectrum[i] = Math.log(sum + 1e-6);
    }
    
    return melSpectrum;
  }

  private computeDCT(melSpectrum: Float32Array): Float32Array {
    const numCoefficients = 13;
    const mfcc = new Float32Array(numCoefficients);
    const N = melSpectrum.length;
    
    for (let i = 0; i < numCoefficients; i++) {
      let sum = 0;
      for (let j = 0; j < N; j++) {
        sum += melSpectrum[j] * Math.cos((Math.PI * i * (2 * j + 1)) / (2 * N));
      }
      mfcc[i] = sum;
    }
    
    return mfcc;
  }

  private async analyzeEmotionalContent(features: AudioFeatures): Promise<EmotionalResponse> {
    // Implement emotion detection using extracted features
    const emotionProbabilities = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      neutral: 0
    };

    // Analyze pitch variations
    const pitchWeight = 0.3;
    if (features.pitch > 200) {
      emotionProbabilities.joy += 0.4 * pitchWeight;
      emotionProbabilities.anger += 0.4 * pitchWeight;
    } else if (features.pitch < 150) {
      emotionProbabilities.sadness += 0.6 * pitchWeight;
      emotionProbabilities.fear += 0.2 * pitchWeight;
    } else {
      emotionProbabilities.neutral += 0.8 * pitchWeight;
    }

    // Analyze volume
    const volumeWeight = 0.3;
    if (features.volume > 0.7) {
      emotionProbabilities.anger += 0.6 * volumeWeight;
      emotionProbabilities.joy += 0.2 * volumeWeight;
    } else if (features.volume < 0.3) {
      emotionProbabilities.sadness += 0.4 * volumeWeight;
      emotionProbabilities.fear += 0.4 * volumeWeight;
    } else {
      emotionProbabilities.neutral += 0.8 * volumeWeight;
    }

    // Analyze spectral features
    const spectralWeight = 0.4;
    const { centroid, rolloff, flux } = features.spectralFeatures;
    
    if (flux > 0.7) {
      emotionProbabilities.anger += 0.4 * spectralWeight;
      emotionProbabilities.joy += 0.4 * spectralWeight;
    } else if (centroid > 0.7) {
      emotionProbabilities.joy += 0.6 * spectralWeight;
    } else if (rolloff < 0.3) {
      emotionProbabilities.sadness += 0.6 * spectralWeight;
    } else {
      emotionProbabilities.neutral += 0.8 * spectralWeight;
    }

    // Find the dominant emotion
    const dominantEmotion = Object.entries(emotionProbabilities)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];

    return {
      primary: dominantEmotion as any,
      probabilities: emotionProbabilities,
      intensity: Math.max(...Object.values(emotionProbabilities)),
      confidence: 0.7, // Could be calculated based on feature reliability
      timestamp: new Date()
    };
  }

  private async analyzeSpeechPatterns(features: AudioFeatures): Promise<{
    speechRate: number;
    articulationQuality: number;
    prosody: {
      variation: number;
      rhythm: number;
    };
  }> {
    return {
      speechRate: features.tempo / 2, // Approximate words per minute
      articulationQuality: this.calculateArticulationQuality(features),
      prosody: {
        variation: this.calculatePitchVariation(features),
        rhythm: this.calculateRhythmicQuality(features)
      }
    };
  }

  private calculateArticulationQuality(features: AudioFeatures): number {
    // Analyze spectral features for articulation quality
    const { centroid, rolloff } = features.spectralFeatures;
    return (centroid + rolloff) / 2;
  }

  private calculatePitchVariation(features: AudioFeatures): number {
    // Analyze pitch stability and variation
    return features.spectralFeatures.flux;
  }

  private calculateRhythmicQuality(features: AudioFeatures): number {
    // Analyze temporal patterns for rhythmic quality
    return Math.min(1, features.tempo / 120); // Normalize around typical speech rate
  }
} 