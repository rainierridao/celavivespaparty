// Audio helpers for the translator: resampling, silence-aware chunking, WAV encoding.
// Plain functions with no DOM access so they run in the browser and under node --test.
(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.TranslatorAudio = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const TARGET_SAMPLE_RATE = 16000;
  const ANALYSIS_WINDOW_SECONDS = 0.03;
  // Below this RMS a 30 ms window counts as a pause between phrases.
  const PAUSE_RMS = 0.012;
  // A chunk whose loudest window is below this is treated as silence and not sent.
  const SILENT_CHUNK_RMS = 0.004;

  // Box-filter downsampler: averaging each output sample's input span is a cheap
  // low-pass that keeps speech clear without aliasing hiss.
  function downsample(input, inputRate, outputRate = TARGET_SAMPLE_RATE) {
    if (inputRate === outputRate) {
      return Float32Array.from(input);
    }

    if (inputRate < outputRate) {
      throw new Error('Upsampling is not supported.');
    }

    const ratio = inputRate / outputRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Float32Array(outputLength);

    for (let index = 0; index < outputLength; index += 1) {
      const start = Math.floor(index * ratio);
      const end = Math.min(input.length, Math.floor((index + 1) * ratio));
      let sum = 0;

      for (let cursor = start; cursor < end; cursor += 1) {
        sum += input[cursor];
      }

      output[index] = end > start ? sum / (end - start) : 0;
    }

    return output;
  }

  // Streaming version of downsample that carries the fractional remainder between
  // calls, so live capture frames join without clicks or drift.
  function createStreamingDownsampler(inputRate, outputRate = TARGET_SAMPLE_RATE) {
    const ratio = inputRate / outputRate;
    let carry = new Float32Array(0);
    // Fraction of an input sample already consumed at the start of carry.
    let phase = 0;

    return function push(frame) {
      if (inputRate === outputRate) {
        return Float32Array.from(frame);
      }

      const joined = new Float32Array(carry.length + frame.length);
      joined.set(carry, 0);
      joined.set(frame, carry.length);
      const outputLength = Math.max(0, Math.floor((joined.length - phase) / ratio));
      const output = new Float32Array(outputLength);

      for (let index = 0; index < outputLength; index += 1) {
        const start = Math.floor(phase + index * ratio);
        const end = Math.floor(phase + (index + 1) * ratio);
        let sum = 0;

        for (let cursor = start; cursor < end; cursor += 1) {
          sum += joined[cursor];
        }

        output[index] = sum / Math.max(1, end - start);
      }

      const consumed = phase + outputLength * ratio;
      const cut = Math.floor(consumed);
      carry = joined.slice(cut);
      phase = consumed - cut;
      return output;
    };
  }

  function mixToMono(channels) {
    if (channels.length === 1) {
      return channels[0];
    }

    const length = channels[0].length;
    const output = new Float32Array(length);

    for (const channel of channels) {
      for (let index = 0; index < length; index += 1) {
        output[index] += channel[index] / channels.length;
      }
    }

    return output;
  }

  function windowRms(samples, start, end) {
    let sum = 0;
    const stop = Math.min(samples.length, end);

    for (let index = start; index < stop; index += 1) {
      sum += samples[index] * samples[index];
    }

    return stop > start ? Math.sqrt(sum / (stop - start)) : 0;
  }

  function peakWindowRms(samples, sampleRate = TARGET_SAMPLE_RATE) {
    const windowSize = Math.max(1, Math.round(sampleRate * ANALYSIS_WINDOW_SECONDS));
    let peak = 0;

    for (let start = 0; start < samples.length; start += windowSize) {
      peak = Math.max(peak, windowRms(samples, start, start + windowSize));
    }

    return peak;
  }

  function isSilent(samples, sampleRate = TARGET_SAMPLE_RATE) {
    return peakWindowRms(samples, sampleRate) < SILENT_CHUNK_RMS;
  }

  // Picks where to end a chunk between minSeconds and maxSeconds: the middle of the
  // longest run of quiet windows, so words are not cut in half. Falls back to the
  // single quietest window when the speaker never pauses.
  function findCutPoint(samples, sampleRate, minSeconds, maxSeconds) {
    const windowSize = Math.max(1, Math.round(sampleRate * ANALYSIS_WINDOW_SECONDS));
    const startSample = Math.floor(minSeconds * sampleRate);
    const endSample = Math.min(samples.length, Math.floor(maxSeconds * sampleRate));

    if (endSample - startSample < windowSize) {
      return Math.min(samples.length, endSample);
    }

    let bestRunLength = 0;
    let bestRunCenter = -1;
    let runStart = -1;
    let quietestRms = Infinity;
    let quietestCenter = endSample;

    for (let start = startSample; start + windowSize <= endSample; start += windowSize) {
      const rms = windowRms(samples, start, start + windowSize);

      if (rms < quietestRms) {
        quietestRms = rms;
        quietestCenter = start + Math.floor(windowSize / 2);
      }

      if (rms < PAUSE_RMS) {
        if (runStart < 0) {
          runStart = start;
        }

        const runLength = start + windowSize - runStart;

        // >= prefers the later pause on ties, which keeps chunks closer to full size.
        if (runLength >= bestRunLength) {
          bestRunLength = runLength;
          bestRunCenter = runStart + Math.floor(runLength / 2);
        }
      } else {
        runStart = -1;
      }
    }

    // A real pause is at least ~150 ms; shorter dips are between syllables.
    if (bestRunCenter >= 0 && bestRunLength >= sampleRate * 0.15) {
      return bestRunCenter;
    }

    return quietestCenter;
  }

  // Splits a whole recording into chunks. Deterministic for the same samples, which
  // lets an interrupted file job resume by sequence number.
  function splitIntoChunks(samples, sampleRate = TARGET_SAMPLE_RATE, { minSeconds = 30, maxSeconds = 45 } = {}) {
    const chunks = [];
    let offset = 0;
    let sequence = 0;

    while (offset < samples.length) {
      const remainingSeconds = (samples.length - offset) / sampleRate;
      let end;

      // Take the tail whole rather than leave a tiny last chunk.
      if (remainingSeconds <= maxSeconds + minSeconds / 3) {
        end = samples.length;
      } else {
        end = offset + findCutPoint(samples.subarray(offset), sampleRate, minSeconds, maxSeconds);
      }

      chunks.push({
        sequence,
        startSample: offset,
        endSample: end,
        startSeconds: offset / sampleRate,
        endSeconds: end / sampleRate
      });
      sequence += 1;
      offset = end;
    }

    return chunks;
  }

  // Live chunker: collects 16 kHz samples and emits a chunk at a natural pause once
  // minSeconds is buffered, or at the quietest point when maxSeconds is reached.
  function createLiveChunker({ sampleRate = TARGET_SAMPLE_RATE, minSeconds = 8, maxSeconds = 20, pauseSeconds = 0.6, onChunk }) {
    let parts = [];
    let bufferedLength = 0;
    let emittedSamples = 0;
    let sequence = 0;
    let trailingQuietSamples = 0;
    const pauseSamples = Math.floor(pauseSeconds * sampleRate);

    function flatten() {
      const all = new Float32Array(bufferedLength);
      let offset = 0;

      for (const part of parts) {
        all.set(part, offset);
        offset += part.length;
      }

      return all;
    }

    function emit(cutAt) {
      const all = flatten();
      const end = Math.max(1, Math.min(all.length, cutAt));
      const samples = all.slice(0, end);
      const rest = all.slice(end);

      onChunk({
        sequence,
        samples,
        startSeconds: emittedSamples / sampleRate,
        endSeconds: (emittedSamples + samples.length) / sampleRate
      });
      sequence += 1;
      emittedSamples += samples.length;
      parts = rest.length ? [rest] : [];
      bufferedLength = rest.length;
      trailingQuietSamples = 0;
    }

    return {
      push(frame) {
        if (!frame || !frame.length) {
          return;
        }

        parts.push(frame);
        bufferedLength += frame.length;

        const frameRms = windowRms(frame, 0, frame.length);
        trailingQuietSamples = frameRms < PAUSE_RMS ? trailingQuietSamples + frame.length : 0;

        const bufferedSeconds = bufferedLength / sampleRate;

        if (bufferedSeconds >= minSeconds && trailingQuietSamples >= pauseSamples) {
          // Cut in the middle of the pause so both chunks keep a little quiet edge.
          emit(bufferedLength - Math.floor(trailingQuietSamples / 2));
        } else if (bufferedSeconds >= maxSeconds) {
          emit(findCutPoint(flatten(), sampleRate, minSeconds, maxSeconds));
        }
      },
      flush() {
        if (bufferedLength >= sampleRate * 0.5) {
          emit(bufferedLength);
        } else {
          parts = [];
          bufferedLength = 0;
        }
      },
      get bufferedSeconds() {
        return bufferedLength / sampleRate;
      },
      get nextSequence() {
        return sequence;
      }
    };
  }

  function encodeWav(samples, sampleRate = TARGET_SAMPLE_RATE) {
    const bytesPerSample = 2;
    const dataLength = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    const writeString = (offset, text) => {
      for (let index = 0; index < text.length; index += 1) {
        view.setUint8(offset + index, text.charCodeAt(index));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    for (let index = 0; index < samples.length; index += 1) {
      const clamped = Math.max(-1, Math.min(1, samples[index]));
      view.setInt16(44 + index * bytesPerSample, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    }

    return new Uint8Array(buffer);
  }

  // Quiet recordings (a far-away speaker, low Zoom volume) are lifted toward a
  // normal level so the AI hears them clearly. Capped so noise is not blown up.
  function normalizeLoudness(samples, targetPeak = 0.9, maxGain = 8) {
    let peak = 0;

    for (let index = 0; index < samples.length; index += 1) {
      peak = Math.max(peak, Math.abs(samples[index]));
    }

    if (peak === 0 || peak >= targetPeak) {
      return samples;
    }

    const gain = Math.min(maxGain, targetPeak / peak);
    const output = new Float32Array(samples.length);

    for (let index = 0; index < samples.length; index += 1) {
      output[index] = samples[index] * gain;
    }

    return output;
  }

  function bytesToBase64(bytes) {
    if (typeof Buffer !== 'undefined' && typeof window === 'undefined') {
      return Buffer.from(bytes).toString('base64');
    }

    let binary = '';
    const step = 0x8000;

    for (let index = 0; index < bytes.length; index += step) {
      binary += String.fromCharCode.apply(null, bytes.subarray(index, index + step));
    }

    return btoa(binary);
  }

  function formatTimestamp(totalSeconds, { srt = false } = {}) {
    const safe = Math.max(0, Number(totalSeconds) || 0);
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = Math.floor(safe % 60);
    const pad = (value, size = 2) => String(value).padStart(size, '0');

    if (srt) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(Math.floor((safe % 1) * 1000), 3)}`;
    }

    return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
  }

  // Long segments become several subtitle cues so each stays readable on screen.
  function buildSrt(segments) {
    const cues = [];

    for (const segment of segments) {
      const text = String(segment.translation || '').trim();

      if (!text) {
        continue;
      }

      const sentences = text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [text];
      const groups = [];
      let current = '';

      for (const sentence of sentences.map((entry) => entry.trim()).filter(Boolean)) {
        if (current && (current + ' ' + sentence).length > 110) {
          groups.push(current);
          current = sentence;
        } else {
          current = current ? `${current} ${sentence}` : sentence;
        }
      }

      if (current) {
        groups.push(current);
      }

      const start = Number(segment.startSeconds) || 0;
      const end = Math.max(start + 1, Number(segment.endSeconds) || start + 1);
      const totalChars = groups.reduce((sum, group) => sum + group.length, 0) || 1;
      let cursor = start;

      for (const group of groups) {
        const span = (end - start) * (group.length / totalChars);
        cues.push({ start: cursor, end: cursor + span, text: group });
        cursor += span;
      }
    }

    return cues
      .map((cue, index) => `${index + 1}\n${formatTimestamp(cue.start, { srt: true })} --> ${formatTimestamp(cue.end, { srt: true })}\n${cue.text}\n`)
      .join('\n');
  }

  return {
    TARGET_SAMPLE_RATE,
    buildSrt,
    bytesToBase64,
    createLiveChunker,
    createStreamingDownsampler,
    downsample,
    encodeWav,
    findCutPoint,
    formatTimestamp,
    isSilent,
    mixToMono,
    normalizeLoudness,
    peakWindowRms,
    splitIntoChunks
  };
});
