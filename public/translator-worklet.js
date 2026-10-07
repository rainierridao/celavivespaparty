// Collects microphone / system audio frames off the main thread and hands them over
// in ~100 ms batches (mono, at the context's native rate) with a level reading.
class TranslatorCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.batchSize = Math.round(sampleRate / 10);
    this.buffer = new Float32Array(this.batchSize);
    this.filled = 0;
  }

  process(inputs) {
    const input = inputs[0];

    if (!input || input.length === 0 || !input[0]) {
      return true;
    }

    const channelCount = input.length;
    const frameLength = input[0].length;

    for (let index = 0; index < frameLength; index += 1) {
      let sample = 0;

      for (let channel = 0; channel < channelCount; channel += 1) {
        sample += input[channel][index];
      }

      this.buffer[this.filled] = sample / channelCount;
      this.filled += 1;

      if (this.filled === this.batchSize) {
        let sum = 0;

        for (let cursor = 0; cursor < this.batchSize; cursor += 1) {
          sum += this.buffer[cursor] * this.buffer[cursor];
        }

        const frame = this.buffer;
        this.port.postMessage({ frame, rms: Math.sqrt(sum / this.batchSize) }, [frame.buffer]);
        this.buffer = new Float32Array(this.batchSize);
        this.filled = 0;
      }
    }

    return true;
  }
}

registerProcessor('translator-capture', TranslatorCaptureProcessor);
