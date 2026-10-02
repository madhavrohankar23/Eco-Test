/**
 * High-fidelity 16kHz PCM WAV Audio Recorder for OpenAI Whisper.
 * Universally supported in Brave, Chrome, Safari, Firefox, and Edge without container codec corruption.
 */

export class WavAudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private audioData: Float32Array[] = [];
  private recordingLength = 0;
  private isRecording = false;
  private onVolumeChange?: ((volume: number) => void) | undefined;

  constructor(options?: { onVolumeChange?: ((volume: number) => void) | undefined }) {
    this.onVolumeChange = options?.onVolumeChange;
  }

  async start(): Promise<void> {
    if (this.isRecording) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    this.mediaStream = stream;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 16000 });

    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    // Buffer size 4096, 1 input channel, 1 output channel
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.audioData = [];
    this.recordingLength = 0;
    this.isRecording = true;

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputBuffer = e.inputBuffer.getChannelData(0);
      const clone = new Float32Array(inputBuffer);
      this.audioData.push(clone);
      this.recordingLength += clone.length;

      if (this.onVolumeChange) {
        let sum = 0;
        const len = inputBuffer.length;
        for (let i = 0; i < len; i++) {
          const val = inputBuffer[i] ?? 0;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / (len || 1));
        this.onVolumeChange(Math.min(1, rms * 5));
      }
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
  }

  async stop(): Promise<Blob | null> {
    if (!this.isRecording) return null;
    this.isRecording = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }

    const sampleRate = this.audioContext?.sampleRate || 16000;
    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        await this.audioContext.close();
      } catch {}
    }

    if (this.recordingLength === 0) return null;

    // Merge Float32Array chunks into single continuous buffer
    const mergedSamples = new Float32Array(this.recordingLength);
    let offset = 0;
    for (const chunk of this.audioData) {
      mergedSamples.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert Float32Array samples to standard 16-bit PCM RIFF WAV
    return this.encodeWAV(mergedSamples, sampleRate);
  }

  cancel(): void {
    this.isRecording = false;
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        this.audioContext.close();
      } catch {}
    }
    this.audioData = [];
    this.recordingLength = 0;
  }

  private encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    this.writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    this.writeString(view, 8, "WAVE");

    // fmt sub-chunk
    this.writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
    view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true);  // NumChannels (1 = mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    view.setUint16(32, 2, true);  // BlockAlign (NumChannels * BitsPerSample/8)
    view.setUint16(34, 16, true); // BitsPerSample (16 bits)

    // data sub-chunk
    this.writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);

    // Write PCM 16-bit samples
    let index = 44;
    for (let i = 0; i < samples.length; i++, index += 2) {
      const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
      view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([view], { type: "audio/wav" });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
