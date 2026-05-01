/**
 * Utility for handling PCM audio playback and recording.
 */

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private isProcessing: boolean = false;
  private sampleRate: number = 24000;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(sampleRate: number = 24000) {
    this.sampleRate = sampleRate;
  }

  async initialize() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.sampleRate,
    });
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.nextStartTime = this.audioContext.currentTime;
  }

  // Play PCM16 audio chunks
  async playChunk(base64Data: string) {
    if (!this.audioContext) await this.initialize();
    if (!this.audioContext) return;

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Int16Array(len / 2);
    for (let i = 0; i < len; i += 2) {
      bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
    }

    const float32Data = new Float32Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      float32Data[i] = bytes[i] / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const startTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
  }

  stopAll() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.nextStartTime = 0;
  }

  async startRecording(onAudioData: (base64Data: string) => void) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recordContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      this.source = recordContext.createMediaStreamSource(this.stream);
      this.processor = recordContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
        }
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
        onAudioData(base64);
      };

      this.source.connect(this.processor);
      this.processor.connect(recordContext.destination);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  }

  stopRecording() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
  }

  async startVideo(onVideoData: (base64Data: string) => void, facingMode: "user" | "environment" = "user") {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480, 
          frameRate: { ideal: 30 },
          facingMode: facingMode
        } 
      });
      const video = document.createElement('video');
      video.srcObject = videoStream;
      video.play();

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      const interval = setInterval(() => {
        if (!videoStream.active) {
          clearInterval(interval);
          return;
        }
        // Sample at 1fps for AI but keep stream smooth for UI
        ctx?.drawImage(video, 0, 0, 640, 480);
        const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
        onVideoData(base64);
      }, 1000);

      return {
        stop: () => {
          clearInterval(interval);
          videoStream.getTracks().forEach(t => t.stop());
        },
        stream: videoStream
      };
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  }

  async startScreenShare(onVideoData: (base64Data: string) => void) {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 }
      });

      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      const video = document.createElement('video');
      video.srcObject = screenStream;
      video.play();

      const interval = setInterval(() => {
        if (!screenStream.active) {
          clearInterval(interval);
          return;
        }
        ctx?.drawImage(video, 0, 0, 1280, 720);
        const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
        onVideoData(base64);
      }, 1000);

      return {
        stop: () => {
          clearInterval(interval);
          screenStream.getTracks().forEach(t => t.stop());
        },
        stream: screenStream
      };
    } catch (err) {
      console.error("Error accessing screen share:", err);
    }
  }
}
