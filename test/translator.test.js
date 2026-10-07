const test = require('node:test');
const assert = require('node:assert/strict');
const audio = require('../public/translator-audio');
const translator = require('../lib/translator');
const { handleApiRequest } = require('../lib/platform');

const RATE = audio.TARGET_SAMPLE_RATE;

function tone(seconds, amplitude = 0.3, frequency = 220) {
  const samples = new Float32Array(Math.round(seconds * RATE));

  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = amplitude * Math.sin((2 * Math.PI * frequency * index) / RATE);
  }

  return samples;
}

function silence(seconds) {
  return new Float32Array(Math.round(seconds * RATE));
}

function concat(...parts) {
  const output = new Float32Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function geminiReply(result) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] } }] })
  };
}

function geminiError(status, message) {
  return { ok: false, status, json: async () => ({ error: { message } }) };
}

const CONFIG = { apiKey: 'test-key', primaryModel: 'primary-model', fallbackModel: 'fallback-model', maxRequestsPerMinute: 8 };
const CHUNK = { audioBase64: 'UklGRg==', mimeType: 'audio/wav', sourceLanguage: 'ceb', targetLanguage: 'en' };

// --- audio helpers ---------------------------------------------------------

test('downsampling 48 kHz to 16 kHz keeps duration', () => {
  const input = new Float32Array(48000).fill(0.5);
  const output = audio.downsample(input, 48000, RATE);

  assert.equal(output.length, 16000);
  assert.ok(Math.abs(output[100] - 0.5) < 1e-6);
});

test('streaming downsampler matches total length across uneven frames', () => {
  const push = audio.createStreamingDownsampler(44100, RATE);
  let total = 0;

  for (let index = 0; index < 100; index += 1) {
    total += push(new Float32Array(441 + (index % 3))).length;
  }

  const expected = Math.floor((100 * 441 + 99) / (44100 / RATE));
  assert.ok(Math.abs(total - expected) <= 1, `${total} vs ${expected}`);
});

test('WAV encoding writes a valid 16 kHz mono PCM header', () => {
  const wav = audio.encodeWav(tone(1));
  const view = new DataView(wav.buffer);
  const text = (offset) => String.fromCharCode(...wav.slice(offset, offset + 4));

  assert.equal(text(0), 'RIFF');
  assert.equal(text(8), 'WAVE');
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), RATE);
  assert.equal(view.getUint32(40, true), RATE * 2);
  assert.equal(wav.length, 44 + RATE * 2);
});

test('silence detection ignores quiet noise but keeps speech-level audio', () => {
  assert.equal(audio.isSilent(silence(5)), true);
  assert.equal(audio.isSilent(tone(5, 0.001)), true);
  assert.equal(audio.isSilent(concat(silence(4), tone(0.5, 0.05))), false);
});

test('cut point lands inside a pause instead of mid-speech', () => {
  const samples = concat(tone(33), silence(0.8), tone(15));
  const cut = audio.findCutPoint(samples, RATE, 30, 45) / RATE;

  assert.ok(cut > 33 && cut < 33.8, `cut at ${cut}s`);
});

test('file chunks cover the whole recording, stay within size limits, and are deterministic', () => {
  const samples = concat(tone(70), silence(1), tone(60), silence(0.5), tone(20));
  const first = audio.splitIntoChunks(samples, RATE, { minSeconds: 30, maxSeconds: 45 });
  const second = audio.splitIntoChunks(samples, RATE, { minSeconds: 30, maxSeconds: 45 });

  assert.deepEqual(first, second);
  assert.equal(first[0].startSample, 0);
  assert.equal(first[first.length - 1].endSample, samples.length);

  first.forEach((chunk, index) => {
    assert.equal(chunk.sequence, index);
    assert.ok(chunk.endSeconds - chunk.startSeconds <= 55, `chunk ${index} too long`);

    if (index > 0) {
      assert.equal(chunk.startSample, first[index - 1].endSample);
    }
  });
});

test('live chunker cuts at a pause after the minimum length and flushes the tail', () => {
  const chunks = [];
  const chunker = audio.createLiveChunker({ minSeconds: 8, maxSeconds: 20, onChunk: (chunk) => chunks.push(chunk) });
  const stream = concat(tone(10), silence(1), tone(3));
  const frame = RATE / 10;

  for (let offset = 0; offset < stream.length; offset += frame) {
    chunker.push(stream.slice(offset, offset + frame));
  }

  assert.equal(chunks.length, 1);
  assert.ok(chunks[0].endSeconds > 10 && chunks[0].endSeconds < 11);

  chunker.flush();
  assert.equal(chunks.length, 2);
  assert.equal(chunks[1].sequence, 1);
  assert.equal(chunks[1].startSeconds, chunks[0].endSeconds);
});

test('live chunker forces a cut at the maximum length when nobody pauses', () => {
  const chunks = [];
  const chunker = audio.createLiveChunker({ minSeconds: 8, maxSeconds: 20, onChunk: (chunk) => chunks.push(chunk) });
  const frame = RATE / 10;
  const stream = tone(25);

  for (let offset = 0; offset < stream.length; offset += frame) {
    chunker.push(stream.slice(offset, offset + frame));
  }

  assert.equal(chunks.length, 1);
  assert.ok(chunks[0].endSeconds <= 20);
});

test('SRT export numbers cues and formats timestamps', () => {
  const srt = audio.buildSrt([
    { startSeconds: 0, endSeconds: 4, translation: 'Good morning everyone.' },
    { startSeconds: 3661.5, endSeconds: 3665, translation: 'Thank you.' },
    { startSeconds: 10, endSeconds: 12, translation: '' }
  ]);

  assert.match(srt, /^1\n00:00:00,000 --> 00:00:04,000\nGood morning everyone\.\n/);
  assert.match(srt, /2\n01:01:01,500 --> 01:01:05,000\nThank you\./);
  assert.doesNotMatch(srt, /\n3\n/);
});

// --- Gemini translator -----------------------------------------------------

test('request body sends the audio with a Cebuano-to-English instruction and JSON schema', () => {
  const body = translator.buildGeminiRequestBody({
    ...CHUNK,
    glossary: 'Celavive = brand',
    previousContext: 'Maayong buntag',
    model: 'gemini-2.5-flash'
  });

  assert.equal(body.contents[0].parts[0].inline_data.mime_type, 'audio/wav');
  assert.match(body.systemInstruction.parts[0].text, /Cebuano/);
  assert.match(body.systemInstruction.parts[0].text, /Translate into: English/);
  assert.match(body.systemInstruction.parts[0].text, /Celavive = brand/);
  assert.match(body.contents[0].parts[1].text, /Maayong buntag/);
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(body.generationConfig.thinkingConfig, { thinkingBudget: 0 });
});

test('a no-speech reply comes back empty instead of invented text', () => {
  const result = translator.parseGeminiResponse({
    candidates: [{ content: { parts: [{ text: '{"sourceText":"(music)","translation":"(music)","hasSpeech":false}' }] } }]
  });

  assert.deepEqual(result, { sourceText: '', translation: '', detectedLanguage: '', hasSpeech: false });
});

test('translateAudioChunk returns the transcript and translation from the primary model', async () => {
  const calls = [];
  const result = await translator.translateAudioChunk(CHUNK, {
    config: CONFIG,
    fetchImpl: async (url, options) => {
      calls.push({ url, headers: options.headers });
      return geminiReply({ sourceText: 'Maayong buntag sa tanan', translation: 'Good morning, everyone', hasSpeech: true });
    }
  });

  assert.equal(result.translation, 'Good morning, everyone');
  assert.equal(result.model, 'primary-model');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /primary-model:generateContent$/);
  assert.equal(calls[0].headers['x-goog-api-key'], 'test-key');
});

test('quota errors on the primary model fall back to the second model', async () => {
  const models = [];
  const result = await translator.translateAudioChunk(CHUNK, {
    config: CONFIG,
    fetchImpl: async (url) => {
      models.push(url.includes('primary-model') ? 'primary' : 'fallback');
      return url.includes('primary-model')
        ? geminiError(429, 'Resource exhausted')
        : geminiReply({ sourceText: 'Salamat', translation: 'Thank you', hasSpeech: true });
    }
  });

  assert.deepEqual(models, ['primary', 'fallback']);
  assert.equal(result.model, 'fallback-model');
});

test('quota exhausted on both models reports a retryable 429', async () => {
  await assert.rejects(
    translator.translateAudioChunk(CHUNK, { config: CONFIG, fetchImpl: async () => geminiError(429, 'Resource exhausted') }),
    (error) => error.statusCode === 429 && error.retryable === true
  );
});

test('a model that rejects thinking settings is retried without them', async () => {
  const bodies = [];
  const result = await translator.translateAudioChunk(CHUNK, {
    config: { ...CONFIG, primaryModel: 'gemini-3.5-flash' },
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body);
      bodies.push(body);
      return body.generationConfig.thinkingConfig
        ? geminiError(400, 'Thinking level is not supported for this model.')
        : geminiReply({ sourceText: 'Oo', translation: 'Yes', hasSpeech: true });
    }
  });

  assert.equal(result.translation, 'Yes');
  assert.equal(bodies.length, 2);
  assert.equal(bodies[1].generationConfig.thinkingConfig, undefined);
});

test('a missing API key fails clearly without calling Gemini', async () => {
  let called = false;

  await assert.rejects(
    translator.translateAudioChunk(CHUNK, {
      config: { ...CONFIG, apiKey: '' },
      fetchImpl: async () => {
        called = true;
      }
    }),
    /GEMINI_API_KEY/
  );
  assert.equal(called, false);
});

test('a hung request times out as retryable', async () => {
  await assert.rejects(
    translator.translateAudioChunk(CHUNK, {
      config: { ...CONFIG, fallbackModel: '' },
      timeoutMs: 50,
      deadlineMs: 3000,
      fetchImpl: (url, options) => new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      })
    }),
    (error) => error.statusCode === 504 && error.retryable === true
  );
});

// --- routes ----------------------------------------------------------------

test('translator routes require login', async () => {
  for (const [method, path] of [
    ['GET', '/api/translator/config'],
    ['GET', '/api/translator/sessions'],
    ['POST', '/api/translator/sessions'],
    ['POST', '/api/translator/chunk'],
    ['GET', '/api/translator/sessions/trs_x'],
    ['DELETE', '/api/translator/sessions/trs_x']
  ]) {
    await assert.rejects(
      handleApiRequest({ method, path, headers: {}, body: {} }),
      (error) => error.statusCode === 401,
      `${method} ${path} should need login`
    );
  }
});

// --- Zoom captions relay -----------------------------------------------------

const zoomCaptions = require('../lib/zoom-captions');
const ZOOM_LINK = 'https://wmcc.zoom.us/closedcaption?id=200610693&ns=GZHkEA==&expire=86400&spparams=id%2Cns%2Cexpire&signature=nYtXJqRKCW';

test('only Zoom caption links are accepted', () => {
  assert.equal(zoomCaptions.normalizeCaptionUrl(ZOOM_LINK).hostname, 'wmcc.zoom.us');
  assert.equal(zoomCaptions.normalizeCaptionUrl(ZOOM_LINK.replace('https:', 'http:')).protocol, 'https:');

  for (const bad of ['https://evil.example.com/closedcaption?id=1&signature=x', 'https://zoom.us.evil.com/closedcaption?id=1&signature=x', 'https://wmcc.zoom.us/other?id=1&signature=x', 'https://wmcc.zoom.us/closedcaption?id=1', 'not a url']) {
    assert.throws(() => zoomCaptions.normalizeCaptionUrl(bad), (error) => error.statusCode === 400, bad);
  }
});

test('captions are posted as plain text with the sequence number', async () => {
  let sent;
  const result = await zoomCaptions.postZoomCaption({ captionUrl: ZOOM_LINK + '&seq=3', seq: 42, text: '  Good morning, everyone.  ' }, {
    fetchImpl: async (url, options) => {
      sent = { url: new URL(url), options };
      return { ok: true, status: 200, text: async () => '2026-10-06T12:00:00.000' };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.timestamp, '2026-10-06T12:00:00.000');
  assert.equal(sent.url.searchParams.get('seq'), '42');
  assert.equal(sent.url.searchParams.getAll('seq').length, 1);
  assert.equal(sent.url.searchParams.get('signature'), 'nYtXJqRKCW');
  assert.equal(sent.options.method, 'POST');
  assert.match(sent.options.headers['Content-Type'], /^text\/plain/);
  assert.equal(sent.options.body, 'Good morning, everyone.');
});

test('Zoom rejections are reported, not thrown', async () => {
  const result = await zoomCaptions.postZoomCaption({ captionUrl: ZOOM_LINK, seq: 1, text: 'Hi' }, {
    fetchImpl: async () => ({ ok: false, status: 403, text: async () => '' })
  });

  assert.deepEqual([result.ok, result.zoomStatus], [false, 403]);
});

test('connecting reads the last sequence number from Zoom', async () => {
  let requested;
  const result = await zoomCaptions.getZoomCaptionSeq({ captionUrl: ZOOM_LINK }, {
    fetchImpl: async (url) => {
      requested = new URL(url);
      return { ok: true, status: 200, text: async () => '17' };
    }
  });

  assert.equal(requested.pathname, '/closedcaption/seq');
  assert.equal(result.lastSeq, 17);
});

test('Zoom caption routes require login', async () => {
  for (const path of ['/api/translator/zoom-caption', '/api/translator/zoom-caption/check']) {
    await assert.rejects(handleApiRequest({ method: 'POST', path, headers: {}, body: {} }), (error) => error.statusCode === 401);
  }
});
