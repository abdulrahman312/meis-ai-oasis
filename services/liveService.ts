import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

// Target Audio Configuration for Gemini Live API
const TARGET_SAMPLE_RATE = 16000;

export type TranscriptionCallback = (role: 'user' | 'model', text: string, isTurnComplete: boolean) => void;
export type StatusCallback = (isConnected: boolean) => void;
export type VolumeCallback = (volume: number) => void;

export class LiveSession {
  private client: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private outputNode: GainNode | null = null;
  
  private nextStartTime: number = 0;
  private sources = new Set<AudioBufferSourceNode>();
  
  private onTranscription: TranscriptionCallback;
  private onStatusChange: StatusCallback;
  private onVolumeChange: VolumeCallback;

  private sessionPromise: Promise<any> | null = null;

  constructor(
      onTranscription: TranscriptionCallback, 
      onStatusChange: StatusCallback,
      onVolumeChange: VolumeCallback
  ) {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.onTranscription = onTranscription;
    this.onStatusChange = onStatusChange;
    this.onVolumeChange = onVolumeChange;
  }

  async connect(systemContext: string) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    
    // Create input context. Note: Browsers might ignore the sampleRate option and use system rate.
    // We will handle resampling manually to be safe.
    this.inputAudioContext = new AudioContextClass({ sampleRate: TARGET_SAMPLE_RATE });
    this.outputAudioContext = new AudioContextClass({ sampleRate: 24000 }); // Output is usually 24k
    
    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const fullSystemInstruction = `You are the AI Agricultural Scientist. Speak clearly and concisely about crop health and farm status.
      
      ${systemContext}
      
      Rules:
      1. If asked for a specific value (e.g., "What is the temperature?"), reply ONLY with the value and a 2-word status.
      2. Do not read out lists unless asked.
      3. RAIN RULE: If Rain Sensor > 500, advise to angle solar panels.
      4. IRRIGATION RULE: If Soil < 30% and Water > 20%, suggest watering.
      5. WATER WARNING: If Water < 10%, alert about low supply.
      `;

      this.sessionPromise = this.client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: fullSystemInstruction,
          inputAudioTranscription: {}, 
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log(">> Live Session Connected");
            this.onStatusChange(true);
            this.startAudioInput();
          },
          onmessage: (msg) => this.handleMessage(msg),
          onclose: () => {
            console.log(">> Live Session Closed");
            this.disconnect();
          },
          onerror: (err) => {
            console.error(">> Live Session Error:", err);
            this.disconnect();
          }
        }
      });
      
    } catch (e) {
      console.error("Connection Failed:", e);
      this.disconnect();
    }
  }

  private startAudioInput() {
    if (!this.inputAudioContext || !this.mediaStream) return;

    this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    
    // We use a script processor to access raw PCM data
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      if (!this.sessionPromise) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate Volume for UI
      this.calculateVolume(inputData);

      // CRITICAL: Resample to 16000Hz if the context is running at a different rate (e.g. 48000Hz)
      // Gemini VAD fails if sample rate in header mismatches actual data speed
      const currentRate = this.inputAudioContext!.sampleRate;
      let processedData = inputData;
      
      if (currentRate !== TARGET_SAMPLE_RATE) {
          processedData = this.downsampleBuffer(inputData, currentRate, TARGET_SAMPLE_RATE);
      }
      
      const pcmData = this.floatTo16BitPCM(processedData);
      const base64Data = this.arrayBufferToBase64(pcmData);
      
      this.sessionPromise.then(session => {
        session.sendRealtimeInput({
            media: {
                mimeType: "audio/pcm;rate=16000",
                data: base64Data
            }
        });
      });
    };

    this.sourceNode.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private calculateVolume(data: Float32Array) {
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
          sum += data[i] * data[i];
      }
      const rms = Math.sqrt(sum / data.length);
      // Normalize somewhat for UI (0-100)
      this.onVolumeChange(Math.min(100, rms * 100 * 5)); 
  }

  // Simple Downsampling (Linear Interpolation)
  private downsampleBuffer(buffer: Float32Array, sampleRate: number, outSampleRate: number): Float32Array {
      if (outSampleRate === sampleRate) {
          return buffer;
      }
      if (outSampleRate > sampleRate) {
          throw new Error("Upsampling not supported");
      }
      const sampleRateRatio = sampleRate / outSampleRate;
      const newLength = Math.round(buffer.length / sampleRateRatio);
      const result = new Float32Array(newLength);
      
      for (let i = 0; i < newLength; i++) {
          const index = i * sampleRateRatio;
          const leftIndex = Math.floor(index);
          const rightIndex = Math.ceil(index);
          const weight = index - leftIndex;
          
          const leftValue = buffer[leftIndex] || 0;
          const rightValue = buffer[rightIndex] || 0;
          
          result[i] = leftValue + weight * (rightValue - leftValue);
      }
      return result;
  }

  private async handleMessage(message: LiveServerMessage) {
    const content = message.serverContent;
    if (!content) return;

    // 1. Handle Audio Output
    const audioData = content.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData) {
        this.playAudio(audioData);
    }

    // 2. Handle Transcription (User)
    if (content.inputTranscription?.text) {
        this.onTranscription('user', content.inputTranscription.text, false);
    }
    
    // 3. Handle Transcription (Model)
    if (content.outputTranscription?.text) {
        this.onTranscription('model', content.outputTranscription.text, false);
    }

    // 4. Handle Turn Complete (finalize text)
    if (content.turnComplete) {
       this.onTranscription('user', '', true); 
       this.onTranscription('model', '', true); 
    }
  }

  private async playAudio(base64Data: string) {
     if (!this.outputAudioContext || !this.outputNode) return;
     
     const arrayBuffer = this.base64ToArrayBuffer(base64Data);
     const audioBuffer = await this.pcmToAudioBuffer(arrayBuffer, this.outputAudioContext);
     
     const source = this.outputAudioContext.createBufferSource();
     source.buffer = audioBuffer;
     source.connect(this.outputNode);
     
     const currentTime = this.outputAudioContext.currentTime;
     if (this.nextStartTime < currentTime) {
         this.nextStartTime = currentTime;
     }
     source.start(this.nextStartTime);
     this.nextStartTime += audioBuffer.duration;
     
     this.sources.add(source);
     source.onended = () => this.sources.delete(source);
  }

  disconnect() {
    this.onStatusChange(false);
    this.sources.forEach(s => s.stop());
    this.sources.clear();
    this.processor?.disconnect();
    this.sourceNode?.disconnect();
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.sessionPromise?.then(session => session.close && session.close());
    
    this.sessionPromise = null;
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.processor = null;
    this.mediaStream = null;
  }

  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
     const output = new Int16Array(input.length);
     for (let i = 0; i < input.length; i++) {
         const s = Math.max(-1, Math.min(1, input[i]));
         output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
     }
     return output.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
  }

  private async pcmToAudioBuffer(data: ArrayBuffer, ctx: AudioContext): Promise<AudioBuffer> {
      const int16 = new Int16Array(data);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768.0;
      }
      const buffer = ctx.createBuffer(1, float32.length, 24000); // 24k output rate
      buffer.copyToChannel(float32, 0);
      return buffer;
  }
}