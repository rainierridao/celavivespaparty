// Meeting & Audio Translator. Loaded before app.js; the app.js helpers it uses
// (renderAdminFrame, escapeHtml, fetchJson, state, navigate, ...) are only called
// once a page renders, by which point app.js has loaded.
//
// The active run lives outside the page DOM, so a live session keeps capturing and
// translating while the user visits other pages in the app.

const TRANSLATOR_PREFS_KEY = 'translatorPrefs';
const TRANSLATOR_RESUME_KEY = 'translatorResumeJob';
const TRANSLATOR_REQUEST_TIMEOUT_MS = 30000;
const TRANSLATOR_WORKLET_URL = '/translator-worklet.js?v=20261006-01';
const TRANSLATOR_LIVE_CHUNK = { minSeconds: 8, maxSeconds: 20 };
const TRANSLATOR_FILE_CHUNK = { minSeconds: 30, maxSeconds: 45 };
const TRANSLATOR_SILENCE_WARNING_MS = 30000;
const TRANSLATOR_MAX_TRANSIENT_ATTEMPTS = 6;

const translatorStore = {
  config: null,
  sessions: null,
  sessionsError: '',
  run: null,
  // Speaker video for Presentation view (a captured Zoom window). Kept outside the
  // DOM so it survives re-renders.
  speakerVideo: null,
  subtitle: { key: '', text: '', timers: [] },
  cropDraft: null,
  zoom: null
};

window.addEventListener('beforeunload', (event) => {
  if (translatorIsBusy()) {
    event.preventDefault();
    event.returnValue = '';
  }
});

document.addEventListener('visibilitychange', () => {
  const run = translatorStore.run;

  if (document.visibilityState === 'visible' && run && isRunActive(run)) {
    void acquireWakeLock(run);
  }
});

function translatorIsBusy() {
  const run = translatorStore.run;
  return Boolean(run && (isRunActive(run) || run.queue.length || run.inFlight));
}

function isRunActive(run) {
  return ['starting', 'running', 'paused', 'stopping'].includes(run.status);
}

// ---------------------------------------------------------------------------
// Preferences and resume state (per browser; never required for correctness)
// ---------------------------------------------------------------------------

function getTranslatorPrefs() {
  const defaults = {
    mode: 'live-mic',
    sourceLanguage: 'ceb',
    targetLanguage: 'en',
    glossary: '',
    deviceId: '',
    fontSize: 17,
    showOriginal: true,
    autoScroll: true,
    focusMode: false,
    presentLayout: 'transcript',
    videoCrop: null,
    cleanView: false
  };

  try {
    return { ...defaults, ...JSON.parse(window.localStorage.getItem(TRANSLATOR_PREFS_KEY) || '{}') };
  } catch (error) {
    return defaults;
  }
}

function setTranslatorPrefs(patch) {
  try {
    window.localStorage.setItem(TRANSLATOR_PREFS_KEY, JSON.stringify({ ...getTranslatorPrefs(), ...patch }));
  } catch (error) {
    // Private browsing: preferences just won't be remembered.
  }
}

function getResumeJob() {
  try {
    const job = JSON.parse(window.localStorage.getItem(TRANSLATOR_RESUME_KEY) || 'null');
    return job && job.sessionId ? job : null;
  } catch (error) {
    return null;
  }
}

function saveResumeJob(job) {
  try {
    if (job) {
      window.localStorage.setItem(TRANSLATOR_RESUME_KEY, JSON.stringify(job));
    } else {
      window.localStorage.removeItem(TRANSLATOR_RESUME_KEY);
    }
  } catch (error) {
    // Resume is a convenience; the saved segments are on the server either way.
  }
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function translatorRequest(path, { method = 'GET', body, timeoutMs = TRANSLATOR_REQUEST_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${state.activeApiBase}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, ok: response.ok, data };
  } catch (error) {
    return { status: 0, ok: false, data: {}, timedOut: error && error.name === 'AbortError' };
  } finally {
    window.clearTimeout(timer);
  }
}

async function loadTranslatorConfig() {
  if (!translatorStore.config) {
    translatorStore.config = await fetchJson('/translator/config');
  }

  return translatorStore.config;
}

async function loadTranslatorSessions({ force = false } = {}) {
  if (!force && translatorStore.sessions && Date.now() - (translatorStore.sessionsLoadedAt || 0) < 15000) {
    return;
  }

  try {
    const result = await fetchJson('/translator/sessions');
    translatorStore.sessions = result.sessions || [];
    translatorStore.sessionsLoadedAt = Date.now();
    translatorStore.sessionsError = '';
  } catch (error) {
    translatorStore.sessionsError = error.message || 'Could not load saved sessions.';
  }
}

// ---------------------------------------------------------------------------
// Run lifecycle
// ---------------------------------------------------------------------------

function createRun({ session, mode }) {
  return {
    session,
    mode,
    status: 'starting',
    segments: [],
    failed: new Map(),
    queue: [],
    inFlight: null,
    doneSequences: new Set(),
    message: '',
    tone: 'info',
    level: 0,
    lastSoundAt: Date.now(),
    startedAt: Date.now(),
    pausedMs: 0,
    pausedAt: 0,
    lastRequestAt: 0,
    pumping: false,
    cancelled: false,
    wakeWaiters: [],
    progress: null,
    capture: null,
    fileSamples: null,
    wakeLock: null,
    tickTimer: null
  };
}

async function startTranslatorRun(form) {
  const config = translatorStore.config;

  if (!config || !config.configured) {
    setTranslatorFormStatus('The translator is not set up yet. Add GEMINI_API_KEY to the server settings.', 'error');
    return;
  }

  const formData = new FormData(form);
  const mode = String(formData.get('translatorMode') || 'live-mic');
  const settings = {
    title: String(formData.get('translatorTitle') || '').trim(),
    mode,
    sourceLanguage: String(formData.get('translatorSource') || 'ceb'),
    targetLanguage: String(formData.get('translatorTarget') || 'en'),
    glossary: String(formData.get('translatorGlossary') || '').trim()
  };
  const deviceId = String(formData.get('translatorDevice') || '');
  const fileInput = document.getElementById('translatorFile');
  const file = fileInput && fileInput.files ? fileInput.files[0] : null;

  setTranslatorPrefs({ mode, sourceLanguage: settings.sourceLanguage, targetLanguage: settings.targetLanguage, glossary: settings.glossary, deviceId });

  if (mode === 'recorded') {
    if (!file) {
      setTranslatorFormStatus('Choose an audio or video file first.', 'error');
      return;
    }

    await startRecordedRun(settings, file, null);
    return;
  }

  await startLiveRun(settings, deviceId);
}

async function startLiveRun(settings, deviceId) {
  setTranslatorFormStatus(settings.mode === 'live-system' ? 'Choose what to share in the browser prompt...' : 'Allow microphone access in the browser prompt...', 'info');

  let stream;

  try {
    stream = await acquireLiveStream(settings.mode, deviceId);
  } catch (error) {
    setTranslatorFormStatus(error.message, 'error');
    return;
  }

  const created = await translatorRequest('/translator/sessions', { method: 'POST', body: settings });

  if (!created.ok) {
    stopStream(stream);
    setTranslatorFormStatus(created.data.error || 'Could not start a session. Check your connection and try again.', 'error');
    return;
  }

  const run = createRun({ session: created.data.session, mode: settings.mode });
  translatorStore.run = run;

  try {
    await openLiveCapture(run, stream, deviceId);
  } catch (error) {
    stopStream(stream);
    run.status = 'finished';
    setRunMessage(run, `Could not start audio capture: ${error.message}`, 'error');
    rerenderTranslatorPage();
    return;
  }

  run.status = 'running';
  run.tickTimer = window.setInterval(() => tickRun(run), 1000);
  void acquireWakeLock(run);
  setRunMessage(run, settings.mode === 'live-system' ? 'Listening to computer audio.' : 'Listening.', 'info');
  rerenderTranslatorPage();
}

async function acquireLiveStream(mode, deviceId) {
  if (!navigator.mediaDevices) {
    throw new Error('This browser cannot capture audio here. Use Chrome on a secure (https) page.');
  }

  if (mode === 'live-system') {
    if (!navigator.mediaDevices.getDisplayMedia) {
      throw new Error('This browser cannot capture computer audio. Use Google Chrome, or use Microphone mode.');
    }

    let stream;

    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        systemAudio: 'include',
        selfBrowserSurface: 'exclude',
        surfaceSwitching: 'include',
        monitorTypeSurfaces: 'include'
      });
    } catch (error) {
      throw new Error(error && error.name === 'NotAllowedError'
        ? 'Sharing was cancelled. Click Start again and choose a screen or tab to share.'
        : `Could not capture computer audio (${error.message}).`);
    }

    if (!stream.getAudioTracks().length) {
      stopStream(stream);
      throw new Error('No audio was shared. Start again, choose "Entire screen", and turn on "Also share system audio". If that switch is missing, see "Zoom app tips" below.');
    }

    // The video track is only needed to open the share; it isn't recorded.
    stream.getVideoTracks().forEach((track) => {
      track.enabled = false;
    });

    return stream;
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
  } catch (error) {
    if (error && error.name === 'NotAllowedError') {
      throw new Error('Microphone access is blocked. Click the lock icon in the address bar, allow the microphone, then try again.');
    }

    if (error && (error.name === 'NotFoundError' || error.name === 'OverconstrainedError')) {
      throw new Error('That microphone was not found. Pick another microphone from the list and try again.');
    }

    throw new Error(`Could not open the microphone (${error.message}).`);
  }
}

function stopStream(stream) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

async function openLiveCapture(run, stream, deviceId) {
  const audioContext = new AudioContext();
  await audioContext.audioWorklet.addModule(TRANSLATOR_WORKLET_URL);

  const node = new AudioWorkletNode(audioContext, 'translator-capture');
  const muted = audioContext.createGain();
  muted.gain.value = 0;
  // Connected to the output (silently) so the browser keeps pulling audio through it.
  node.connect(muted).connect(audioContext.destination);

  const downsample = TranslatorAudio.createStreamingDownsampler(audioContext.sampleRate);
  const chunker = TranslatorAudio.createLiveChunker({
    ...TRANSLATOR_LIVE_CHUNK,
    onChunk: (chunk) => enqueueChunk(run, chunk)
  });

  node.port.onmessage = ({ data }) => {
    run.level = data.rms;

    if (data.rms > 0.004) {
      run.lastSoundAt = Date.now();
    }

    if (run.status === 'running') {
      chunker.push(downsample(data.frame));
    }

    updateTranslatorLevel(run);
  };

  run.capture = { audioContext, node, chunker, stream: null, source: null, deviceId, reconnecting: false };
  attachCaptureStream(run, stream);

  audioContext.addEventListener('statechange', () => {
    if (audioContext.state === 'suspended' && isRunActive(run)) {
      void audioContext.resume().catch(() => {});
    }
  });
}

function attachCaptureStream(run, stream) {
  const capture = run.capture;

  if (capture.source) {
    capture.source.disconnect();
  }

  capture.stream = stream;
  capture.source = capture.audioContext.createMediaStreamSource(stream);
  capture.source.connect(capture.node);

  const [audioTrack] = stream.getAudioTracks();

  if (audioTrack) {
    audioTrack.addEventListener('ended', () => {
      void handleCaptureEnded(run);
    });
  }
}

// A microphone can drop out (USB hiccup, Bluetooth switch). Reconnect quietly a few
// times before giving up. A screen share that ends means the user stopped sharing.
async function handleCaptureEnded(run) {
  if (!isRunActive(run) || run.status === 'stopping' || !run.capture || run.capture.reconnecting) {
    return;
  }

  if (run.mode === 'live-system') {
    setRunMessage(run, 'Screen sharing stopped, so audio capture ended. Finishing the remaining translation.', 'warn');
    await stopTranslatorRun(run);
    return;
  }

  run.capture.reconnecting = true;
  setRunMessage(run, 'Microphone disconnected. Reconnecting...', 'warn');

  for (let attempt = 0; attempt < 5 && isRunActive(run); attempt += 1) {
    await translatorSleep(run, 1500);

    try {
      const stream = await acquireLiveStream('live-mic', attempt < 2 ? run.capture.deviceId : '');
      attachCaptureStream(run, stream);
      run.capture.reconnecting = false;
      setRunMessage(run, 'Microphone reconnected. Listening.', 'info');
      return;
    } catch (error) {
      // Try again, falling back to the default microphone.
    }
  }

  run.capture.reconnecting = false;

  if (isRunActive(run)) {
    setRunMessage(run, 'The microphone could not be reconnected. Finishing the remaining translation.', 'error');
    await stopTranslatorRun(run);
  }
}

function closeLiveCapture(run) {
  const capture = run.capture;

  if (!capture) {
    return;
  }

  capture.chunker.flush();
  capture.node.port.onmessage = null;
  stopStream(capture.stream);
  void capture.audioContext.close().catch(() => {});
  run.capture = null;
  run.level = 0;
}

async function decodeAudioFile(file) {
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

  if (!OfflineContext) {
    throw new Error('This browser cannot read audio files. Use Google Chrome.');
  }

  const bytes = await file.arrayBuffer();
  // Decoding through a 16 kHz context resamples during decode, which keeps memory
  // low enough for multi-hour recordings.
  const context = new OfflineContext(1, 1, TranslatorAudio.TARGET_SAMPLE_RATE);
  let audioBuffer;

  try {
    audioBuffer = await context.decodeAudioData(bytes);
  } catch (error) {
    throw new Error('This file could not be read as audio. Use an .m4a, .mp3, .wav, .mp4 or .webm file. Very long recordings may need to be split into parts of about 2 hours.');
  }

  const channels = [];

  for (let index = 0; index < audioBuffer.numberOfChannels; index += 1) {
    channels.push(audioBuffer.getChannelData(index));
  }

  return TranslatorAudio.mixToMono(channels);
}

async function startRecordedRun(settings, file, resumeJob) {
  if (file.size > 600 * 1024 * 1024) {
    setTranslatorFormStatus('This file is very large. Export the audio only (an .m4a from Zoom) or split it into parts, then try again.', 'error');
    return;
  }

  setTranslatorFormStatus('Reading the audio file. Long recordings can take a minute...', 'info');
  const startButton = document.getElementById('translatorStartButton');

  if (startButton) {
    startButton.disabled = true;
  }

  let samples;

  try {
    samples = await decodeAudioFile(file);
  } catch (error) {
    setTranslatorFormStatus(error.message, 'error');

    if (startButton) {
      startButton.disabled = false;
    }

    return;
  }

  const chunks = TranslatorAudio.splitIntoChunks(samples, TranslatorAudio.TARGET_SAMPLE_RATE, TRANSLATOR_FILE_CHUNK);
  let session;
  let existingSegments = [];

  if (resumeJob) {
    const existing = await translatorRequest(`/translator/sessions/${encodeURIComponent(resumeJob.sessionId)}`);

    if (!existing.ok) {
      saveResumeJob(null);
      setTranslatorFormStatus('The interrupted session no longer exists. Start a new translation instead.', 'error');
      rerenderTranslatorPage();
      return;
    }

    session = existing.data.session;
    existingSegments = existing.data.segments || [];

    if (resumeJob.totalChunks && resumeJob.totalChunks !== chunks.length) {
      setTranslatorFormStatus('This does not look like the same file (its length is different). Choose the original file, or discard the interrupted job.', 'error');

      if (startButton) {
        startButton.disabled = false;
      }

      return;
    }
  } else {
    const created = await translatorRequest('/translator/sessions', {
      method: 'POST',
      body: { ...settings, title: settings.title || file.name.replace(/\.[^.]+$/, '') }
    });

    if (!created.ok) {
      setTranslatorFormStatus(created.data.error || 'Could not start a session. Check your connection and try again.', 'error');

      if (startButton) {
        startButton.disabled = false;
      }

      return;
    }

    session = created.data.session;
  }

  const run = createRun({ session, mode: 'recorded' });
  const done = new Set([...(resumeJob ? resumeJob.doneSequences || [] : []), ...existingSegments.map((segment) => segment.sequence)]);

  run.fileSamples = samples;
  run.segments = existingSegments;
  run.doneSequences = done;
  run.progress = { total: chunks.length, durationSeconds: samples.length / TranslatorAudio.TARGET_SAMPLE_RATE };
  run.resumeJob = {
    sessionId: session.sessionId,
    title: session.title,
    fileName: file.name,
    fileSize: file.size,
    totalChunks: chunks.length,
    doneSequences: [...done]
  };
  translatorStore.run = run;
  saveResumeJob(run.resumeJob);

  for (const chunk of chunks) {
    if (!done.has(chunk.sequence)) {
      enqueueChunk(run, {
        sequence: chunk.sequence,
        samples: samples.subarray(chunk.startSample, chunk.endSample),
        startSeconds: chunk.startSeconds,
        endSeconds: chunk.endSeconds
      });
    }
  }

  run.status = 'running';
  run.tickTimer = window.setInterval(() => tickRun(run), 1000);
  void acquireWakeLock(run);
  setRunMessage(run, done.size ? `Resuming: ${done.size} of ${chunks.length} parts were already done.` : 'Translating the recording.', 'info');
  rerenderTranslatorPage();
  maybeFinishRun(run);
}

function enqueueChunk(run, chunk) {
  if (TranslatorAudio.isSilent(chunk.samples)) {
    markSequenceDone(run, chunk.sequence);
    return;
  }

  run.queue.push({ ...chunk, attempts: 0 });
  run.queue.sort((left, right) => left.sequence - right.sequence);
  updateTranslatorLive(run);
  void pumpQueue(run);
}

function markSequenceDone(run, sequence) {
  run.doneSequences.add(sequence);

  if (run.resumeJob) {
    run.resumeJob.doneSequences = [...run.doneSequences];
    saveResumeJob(run.resumeJob);
  }
}

// One request at a time, in order, paced under the free-tier per-minute limit.
// A chunk is never dropped silently: it either becomes a segment or a visible
// failed entry with its audio kept for Retry.
async function pumpQueue(run) {
  if (run.pumping) {
    return;
  }

  run.pumping = true;

  try {
    while (run.queue.length && !run.cancelled) {
      if (run.status === 'paused' && run.mode === 'recorded') {
        await translatorSleep(run, 60 * 60 * 1000);
        continue;
      }

      if (!navigator.onLine) {
        setRunMessage(run, 'You are offline. Translation will continue when the connection is back; audio is kept until then.', 'warn');
        await waitForOnline(run);
        continue;
      }

      const rpm = (translatorStore.config && translatorStore.config.maxRequestsPerMinute) || 8;
      const waitMs = run.lastRequestAt + 60000 / rpm - Date.now();

      if (waitMs > 0) {
        await translatorSleep(run, waitMs);
        continue;
      }

      const item = run.queue[0];
      run.inFlight = item;
      run.lastRequestAt = Date.now();
      updateTranslatorLive(run);

      const outcome = await sendChunk(run, item);
      run.inFlight = null;

      if (run.cancelled) {
        break;
      }

      if (outcome.ok) {
        removeFromQueue(run, item);
        acceptSegment(run, outcome.segment);
        markSequenceDone(run, item.sequence);

        if (run.tone !== 'info' && !run.capture?.reconnecting) {
          setRunMessage(run, run.mode === 'recorded' ? 'Translating the recording.' : 'Listening.', 'info');
        }
      } else if (outcome.fatal) {
        removeFromQueue(run, item);
        run.failed.set(item.sequence, { item, message: outcome.message });
        setRunMessage(run, outcome.message, 'error');
        await haltRun(run);
        break;
      } else if (outcome.retryAfterMs !== undefined) {
        item.attempts += 1;

        if (outcome.transient && item.attempts >= TRANSLATOR_MAX_TRANSIENT_ATTEMPTS) {
          removeFromQueue(run, item);
          run.failed.set(item.sequence, { item, message: outcome.message });
          setRunMessage(run, `One part could not be translated after several tries. You can retry it from the transcript.`, 'warn');
        } else {
          setRunMessage(run, outcome.message, 'warn');
          await translatorSleep(run, outcome.retryAfterMs);
        }
      } else {
        removeFromQueue(run, item);
        run.failed.set(item.sequence, { item, message: outcome.message });
        setRunMessage(run, outcome.message, 'warn');
      }

      updateTranslatorTranscript(run);
      updateTranslatorLive(run);
    }
  } finally {
    run.pumping = false;
    run.inFlight = null;
    updateTranslatorLive(run);
    maybeFinishRun(run);
  }
}

async function sendChunk(run, item) {
  const wav = TranslatorAudio.encodeWav(TranslatorAudio.normalizeLoudness(item.samples));
  const previousContext = run.segments
    .filter((segment) => segment.sequence < item.sequence)
    .slice(-2)
    .map((segment) => segment.sourceText)
    .join(' ');
  const result = await translatorRequest('/translator/chunk', {
    method: 'POST',
    body: {
      sessionId: run.session.sessionId,
      sequence: item.sequence,
      startSeconds: item.startSeconds,
      endSeconds: item.endSeconds,
      mimeType: 'audio/wav',
      audioBase64: TranslatorAudio.bytesToBase64(wav),
      previousContext
    }
  });
  const message = result.data.error || '';
  const backoff = (base, cap) => Math.min(cap, base * 2 ** Math.min(item.attempts, 5));

  if (result.ok) {
    return { ok: true, segment: result.data.segment };
  }

  if (result.status === 0) {
    return {
      retryAfterMs: backoff(2000, 30000),
      transient: true,
      message: result.timedOut ? 'The translation server is slow to respond. Retrying.' : 'Could not reach the server. Retrying.'
    };
  }

  if (result.status === 429) {
    return {
      retryAfterMs: backoff(15000, 120000),
      message: item.attempts >= 3
        ? 'The free AI quota is still used up. If the daily limit was reached, translation resumes after midnight US Pacific time; your audio is kept while this page stays open.'
        : 'Free AI limit reached for this minute. Waiting, then continuing automatically.'
    };
  }

  if (result.status === 401) {
    return { retryAfterMs: 30000, message: 'Your login expired. Log in again in another tab; translation will continue automatically.' };
  }

  if ([502, 503, 504].includes(result.status)) {
    return { retryAfterMs: backoff(3000, 60000), transient: true, message: message || 'The AI service is busy. Retrying.' };
  }

  if (result.status === 404 || result.status === 500) {
    return { fatal: true, message: message || 'The translator stopped because of a server problem.' };
  }

  return { message: message || 'This part could not be translated.' };
}

function removeFromQueue(run, item) {
  run.queue = run.queue.filter((entry) => entry !== item);
}

function acceptSegment(run, segment) {
  if (!segment || !segment.hasSpeech) {
    return;
  }

  run.segments = run.segments.filter((entry) => entry.sequence !== segment.sequence);
  run.segments.push(segment);
  run.segments.sort((left, right) => left.sequence - right.sequence);
  run.failed.delete(segment.sequence);
  queueZoomCaptions(segment);
}

function retryFailedSegments(run, sequence) {
  const entries = sequence === undefined
    ? [...run.failed.values()]
    : [run.failed.get(sequence)].filter(Boolean);

  for (const entry of entries) {
    run.failed.delete(entry.item.sequence);
    run.queue.push({ ...entry.item, attempts: 0 });
  }

  run.queue.sort((left, right) => left.sequence - right.sequence);

  if (run.status === 'finished' && entries.length) {
    run.status = 'stopping';
    run.cancelled = false;
  }

  wakeRun(run);
  updateTranslatorTranscript(run);
  updateTranslatorLive(run);
  void pumpQueue(run);
}

async function stopTranslatorRun(run) {
  if (!run || run.status === 'finished') {
    return;
  }

  if (run.capture) {
    closeLiveCapture(run);
  }

  if (run.status === 'paused') {
    run.pausedMs += Date.now() - run.pausedAt;
  }

  run.status = 'stopping';

  // Stopping a file job leaves the rest for later: the resume banner picks it up.
  if (run.mode === 'recorded' && run.queue.length) {
    run.queue = [];
    setRunMessage(run, 'Stopped. Choose the same file later to continue where it left off.', 'warn');
  } else if (run.queue.length || run.inFlight) {
    setRunMessage(run, 'Capture stopped. Finishing the remaining translation...', 'info');
  }

  wakeRun(run);
  rerenderTranslatorPage();
  maybeFinishRun(run);
  void pumpQueue(run);
}

// "Stop now" while waiting on quota: queued audio becomes retryable failed entries.
async function abandonQueue(run) {
  for (const item of run.queue) {
    run.failed.set(item.sequence, { item, message: 'Not translated (stopped before it was sent).' });
  }

  run.queue = [];
  wakeRun(run);
  maybeFinishRun(run);
}

async function haltRun(run) {
  if (run.capture) {
    closeLiveCapture(run);
  }

  for (const item of run.queue) {
    run.failed.set(item.sequence, { item, message: 'Not sent because the translator stopped.' });
  }

  run.queue = [];
  run.status = 'stopping';
  maybeFinishRun(run);
}

function maybeFinishRun(run) {
  if (run.status === 'running' && run.mode === 'recorded' && !run.queue.length && !run.inFlight) {
    run.status = 'stopping';
  }

  if (run.status !== 'stopping' || run.queue.length || run.inFlight || run.pumping) {
    return;
  }

  run.status = 'finished';
  window.clearInterval(run.tickTimer);
  releaseWakeLock(run);

  if (run.mode === 'recorded') {
    if (run.progress && run.doneSequences.size >= run.progress.total) {
      saveResumeJob(null);
    }

    run.fileSamples = null;
  }

  const fileIncomplete = run.mode === 'recorded' && run.progress && run.doneSequences.size < run.progress.total;

  if (fileIncomplete && run.tone !== 'error') {
    setRunMessage(run, `Stopped at ${run.doneSequences.size} of ${run.progress.total} parts. Choose the same file later to continue where it left off.`, 'warn');
  } else if (run.tone !== 'error') {
    setRunMessage(
      run,
      run.failed.size
        ? `Finished with ${run.failed.size} part(s) not translated. Use Retry in the transcript.`
        : `Finished. ${run.segments.length} part(s) translated and saved.`,
      run.failed.size ? 'warn' : 'success'
    );
  }

  void translatorRequest(`/translator/sessions/${encodeURIComponent(run.session.sessionId)}`, {
    method: 'PATCH',
    body: {
      status: 'completed',
      segmentCount: run.segments.length,
      durationSeconds: getRunAudioSeconds(run)
    }
  }).then(() => {
    translatorStore.sessions = null;

    if (isOnTranslatorHome()) {
      void loadTranslatorSessions({ force: true }).then(renderTranslatorHistory);
    }
  });

  rerenderTranslatorPage();
}

function getRunAudioSeconds(run) {
  if (run.progress) {
    return run.progress.durationSeconds;
  }

  return Math.round((Date.now() - run.startedAt - run.pausedMs) / 1000);
}

function toggleRunPause(run) {
  if (run.status === 'running') {
    run.status = 'paused';
    run.pausedAt = Date.now();

    if (run.capture) {
      run.capture.chunker.flush();
    }

    setRunMessage(run, run.mode === 'recorded' ? 'Paused. The current part will finish first.' : 'Paused. Audio is not being captured.', 'info');
  } else if (run.status === 'paused') {
    run.status = 'running';
    run.pausedMs += Date.now() - run.pausedAt;
    run.lastSoundAt = Date.now();
    setRunMessage(run, run.mode === 'recorded' ? 'Translating the recording.' : 'Listening.', 'info');
    wakeRun(run);
  }

  rerenderTranslatorPage();
}

function tickRun(run) {
  if (run.status === 'running' && run.capture && Date.now() - run.lastSoundAt > TRANSLATOR_SILENCE_WARNING_MS && run.tone === 'info') {
    setRunMessage(
      run,
      run.mode === 'live-system'
        ? 'No sound for 30 seconds. Check that Zoom audio is playing and system audio is being shared.'
        : 'No sound for 30 seconds. Check the microphone and that the speaker is close enough.',
      'warn'
    );
  }

  if (run.tone === 'warn' && /No sound for 30/.test(run.message) && Date.now() - run.lastSoundAt < 2000) {
    setRunMessage(run, 'Listening.', 'info');
  }

  updateTranslatorLive(run);
}

function translatorSleep(run, ms) {
  return new Promise((resolve) => {
    const timer = window.setTimeout(done, ms);

    function done() {
      window.clearTimeout(timer);
      run.wakeWaiters = run.wakeWaiters.filter((waiter) => waiter !== done);
      resolve();
    }

    run.wakeWaiters.push(done);
  });
}

function wakeRun(run) {
  [...run.wakeWaiters].forEach((waiter) => waiter());
}

function waitForOnline(run) {
  return new Promise((resolve) => {
    const onOnline = () => {
      window.removeEventListener('online', onOnline);
      resolve();
    };

    window.addEventListener('online', onOnline);
    void translatorSleep(run, 15000).then(onOnline);
  });
}

async function acquireWakeLock(run) {
  try {
    if ('wakeLock' in navigator && !run.wakeLock) {
      run.wakeLock = await navigator.wakeLock.request('screen');
      run.wakeLock.addEventListener('release', () => {
        run.wakeLock = null;
      });
    }
  } catch (error) {
    // Not supported or denied; the session still works while the screen stays on.
  }
}

function releaseWakeLock(run) {
  if (run.wakeLock) {
    void run.wakeLock.release().catch(() => {});
    run.wakeLock = null;
  }
}

function setRunMessage(run, message, tone) {
  run.message = message;
  run.tone = tone;
  updateTranslatorLive(run);
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

function isOnTranslatorHome() {
  return normalizePath(window.location.pathname) === '/translator';
}

function rerenderTranslatorPage() {
  if (isOnTranslatorHome()) {
    renderPage(renderTranslatorPage());
    attachAdminShellHandlers();
    attachTranslatorHandlers();
  }

  refreshTranslatorSidebarIndicator();
}

function refreshTranslatorSidebarIndicator() {
  const link = document.querySelector('.sidebar-link[href="/translator"]');

  if (link) {
    link.classList.toggle('is-translating', translatorIsBusy());
  }
}

function translatorLanguageOptions(languages, selected) {
  return Object.entries(languages || {})
    .map(([code, label]) => `<option value="${escapeAttribute(code)}"${code === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`)
    .join('');
}

function translatorLanguageName(code, kind) {
  const config = translatorStore.config || {};
  const list = kind === 'source' ? config.sourceLanguages : config.targetLanguages;
  const name = list && list[code] ? list[code] : code;
  return String(name).split(' (')[0];
}

function renderTranslatorStatusPill(run) {
  if (!run) {
    return '<span class="translator-pill" data-tone="idle">Ready</span>';
  }

  const labels = {
    starting: 'Starting',
    running: run.mode === 'recorded' ? 'Translating' : 'Live',
    paused: 'Paused',
    stopping: 'Finishing',
    finished: 'Finished'
  };
  const tone = run.status === 'running' ? (run.tone === 'warn' || run.tone === 'error' ? 'warn' : 'live') : run.status;
  return `<span class="translator-pill" data-tone="${escapeAttribute(tone)}">${escapeHtml(labels[run.status] || run.status)}</span>`;
}

// newestFirst is the live view: the latest translation sits on top and is the
// focus; earlier parts fade below it. Saved sessions read top to bottom.
function renderTranslatorSegments({ segments, failed = [], pending = [], showSource = true, newestFirst = false }) {
  const rows = [
    ...segments.map((segment) => ({ type: 'done', sequence: segment.sequence, segment })),
    ...failed.map((entry) => ({ type: 'failed', sequence: entry.item.sequence, entry })),
    ...pending.map((item) => ({ type: 'pending', sequence: item.sequence, item }))
  ].sort((left, right) => (newestFirst ? right.sequence - left.sequence : left.sequence - right.sequence));
  const latestSequence = newestFirst && segments.length ? Math.max(...segments.map((segment) => segment.sequence)) : null;

  if (!rows.length) {
    return '<li class="translator-empty">The translation will appear here, part by part, as the speaker talks.</li>';
  }

  return rows.map((row) => {
    if (row.type === 'done') {
      const { segment } = row;
      return `
        <li class="translator-segment${segment.sequence === latestSequence ? ' is-latest' : ''}">
          <span class="translator-segment-time">${escapeHtml(TranslatorAudio.formatTimestamp(segment.startSeconds))}</span>
          <div class="translator-segment-body">
            <p class="translator-segment-translation">${escapeHtml(segment.translation)}</p>
            ${showSource ? `<p class="translator-segment-source">${escapeHtml(segment.sourceText)}</p>` : ''}
          </div>
        </li>
      `;
    }

    const item = row.type === 'failed' ? row.entry.item : row.item;
    const range = `${TranslatorAudio.formatTimestamp(item.startSeconds)} to ${TranslatorAudio.formatTimestamp(item.endSeconds)}`;

    if (row.type === 'failed') {
      return `
        <li class="translator-segment is-failed">
          <span class="translator-segment-time">${escapeHtml(TranslatorAudio.formatTimestamp(item.startSeconds))}</span>
          <div class="translator-segment-body">
            <p>Not translated (${escapeHtml(range)}): ${escapeHtml(row.entry.message)}</p>
            <button type="button" class="button-link button-link-secondary" data-translator-retry="${item.sequence}">Retry</button>
          </div>
        </li>
      `;
    }

    return `
      <li class="translator-segment is-pending">
        <span class="translator-segment-time">${escapeHtml(TranslatorAudio.formatTimestamp(item.startSeconds))}</span>
        <div class="translator-segment-body"><p>Translating ${escapeHtml(range)}...</p></div>
      </li>
    `;
  }).join('');
}

function renderTranslatorToolbar(prefs, { live = false } = {}) {
  const exportItems = [
    ['copy', 'Copy English text'],
    ['txt', 'English (.txt)'],
    ['bilingual', 'English + original (.txt)'],
    ['srt', 'Subtitles (.srt)'],
    ['print', 'Print / Save as PDF']
  ];

  return `
    <div class="translator-toolbar">
      <div class="translator-toolbar-group">
        <label class="translator-toggle"><input type="checkbox" id="translatorShowOriginal"${prefs.showOriginal ? ' checked' : ''}> Show original</label>
        ${live ? `<label class="translator-toggle"><input type="checkbox" id="translatorAutoScroll"${prefs.autoScroll ? ' checked' : ''}> Follow newest</label>` : ''}
        <div class="translator-font-controls" role="group" aria-label="Text size">
          <button type="button" data-translator-font="-1" aria-label="Smaller text" title="Smaller text">A&minus;</button>
          <button type="button" data-translator-font="1" aria-label="Larger text" title="Larger text">A+</button>
        </div>
      </div>
      <div class="translator-toolbar-group translator-toolbar-actions">
        ${live ? `
          <div class="translator-present-controls">
            <div class="translator-layout-switch" role="group" aria-label="Layout">
              ${[['transcript', 'Transcript'], ['side', 'Side by side'], ['subtitles', 'Subtitles']].map(([value, label]) => `
                <button type="button" data-translator-layout="${value}" aria-pressed="${prefs.presentLayout === value ? 'true' : 'false'}">${label}</button>`).join('')}
            </div>
            <button type="button" id="translatorVideoButton" class="translator-tool-button">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="m16 10.5 5-3v9l-5-3" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
              <span>${translatorStore.speakerVideo ? 'Change video' : 'Choose speaker video'}</span>
            </button>
            <button type="button" id="translatorCropButton" class="translator-tool-button"${translatorStore.speakerVideo ? '' : ' hidden'}>Crop</button>
            <button type="button" id="translatorVideoRemove" class="translator-tool-button"${translatorStore.speakerVideo ? '' : ' hidden'} aria-label="Remove speaker video" title="Remove speaker video">&times;</button>
            <button type="button" data-translator-clean="on" class="translator-tool-button" title="Hide controls (H)">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7a13 13 0 0 1-2.6 3.7M6.1 6.6C4.2 7.9 3 9.8 2.5 12c1 2.5 4.5 7 9.5 7 1.7 0 3.2-.5 4.5-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>Hide controls</span>
            </button>
            <button type="button" data-translator-fullscreen class="translator-tool-button" title="Full screen">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>Full screen</span>
            </button>
          </div>
          <button type="button" id="translatorFocusToggle" class="translator-tool-button translator-focus-toggle" aria-pressed="${prefs.focusMode ? 'true' : 'false'}">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>${prefs.focusMode ? 'Exit presentation' : 'Presentation view'}</span>
          </button>` : ''}
        <details class="translator-export">
          <summary class="translator-tool-button">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>Export</span>
          </summary>
          <div class="translator-export-menu" role="menu">
            ${exportItems.map(([kind, label]) => `<button type="button" role="menuitem" data-translator-export="${kind}">${label}</button>`).join('')}
          </div>
        </details>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Translator home page (/translator)
// ---------------------------------------------------------------------------

function renderTranslatorPage() {
  const config = translatorStore.config;
  const run = translatorStore.run;
  const prefs = getTranslatorPrefs();
  const resumeJob = !run || run.status === 'finished' ? getResumeJob() : null;
  const active = Boolean(run && isRunActive(run));
  const mode = active || (run && run.status === 'finished') ? run.mode : prefs.mode;
  const disabled = active ? ' disabled' : '';
  const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const setupNotice = config && !config.configured
    ? `
      <div class="translator-notice" data-tone="error">
        <strong>One-time setup needed.</strong>
        Create a free Gemini API key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>,
        add it as <code>GEMINI_API_KEY</code> in the server settings (the <code>.env</code> file locally, or Netlify environment variables), then restart.
      </div>
    `
    : '';

  const resumeNotice = resumeJob
    ? `
      <div class="translator-notice" data-tone="warn">
        <strong>Unfinished file: ${escapeHtml(resumeJob.title || resumeJob.fileName)}</strong>
        <span>${resumeJob.doneSequences.length} of ${resumeJob.totalChunks} parts were translated before it stopped. Choose the same file (${escapeHtml(resumeJob.fileName)}) to continue where it left off.</span>
        <div class="translator-notice-actions">
          <label class="button-link" for="translatorResumeFile">Choose file to continue</label>
          <input id="translatorResumeFile" type="file" accept="audio/*,video/*,.m4a,.mp3,.wav,.mp4,.webm,.ogg,.aac" hidden>
          <button type="button" id="translatorResumeDiscard" class="button-link button-link-secondary">Discard</button>
        </div>
      </div>
    `
    : '';

  const controls = active
    ? `
      <div class="translator-run-controls">
        ${run.status === 'stopping'
          ? `<button type="button" class="topbar-primary" disabled>Finishing...</button>
             ${run.queue.length ? `<button type="button" id="translatorAbandonButton" class="button-link button-link-secondary">Stop now (${run.queue.length} not translated)</button>` : ''}`
          : `<button type="button" id="translatorStopButton" class="topbar-primary translator-stop">Stop</button>
             <button type="button" id="translatorPauseButton" class="button-link button-link-secondary">${run.status === 'paused' ? 'Resume' : 'Pause'}</button>`}
      </div>
    `
    : `
      <div class="translator-run-controls">
        <button type="submit" id="translatorStartButton" class="topbar-primary"${config && config.configured ? '' : ' disabled'}>Start translating</button>
        ${run && run.status === 'finished' ? `<a href="/translator/${encodeURIComponent(run.session.sessionId)}" data-link class="button-link button-link-secondary">Open saved session</a>` : ''}
      </div>
    `;

  return renderAdminFrame({
    activeView: 'translator',
    user: state.session,
    eventCount: state.cachedEventCount,
    title: 'Translator',
    subtitle: 'Translate live trainings, Zoom meetings, or recordings. Cebuano to English by default.',
    badge: 'Meeting translator',
    headerControls: renderHeaderBackLink('/dashboard', 'Back to dashboard'),
    content: `
      <section class="translator-layout${prefs.focusMode ? ' is-focus' : ''}${prefs.cleanView ? ' is-clean' : ''}" data-present="${escapeAttribute(prefs.presentLayout)}">
        <section class="workspace-panel translator-setup">
          <div class="workspace-heading">
            <div>
              <span class="section-kicker">${active ? 'Session running' : 'New session'}</span>
              <h2>${active || (run && run.status === 'finished') ? escapeHtml(run.session.title) : 'Set up'}</h2>
            </div>
          </div>
          ${setupNotice}
          ${resumeNotice}
          <form id="translatorForm" class="stack-form modern-form translator-form">
            <div class="field">
              <label for="translatorTitle">Session name</label>
              <input id="translatorTitle" name="translatorTitle" type="text" maxlength="120" placeholder="Training, ${escapeAttribute(today)}"${disabled}>
            </div>

            <fieldset class="translator-modes"${disabled}>
              <legend>Audio source</legend>
              ${[
                ['live-mic', 'Microphone', 'A speaker in the room, or audio playing near this laptop.'],
                ['live-system', 'Zoom / computer audio', 'Captures sound from the Zoom app or any app on this computer.'],
                ['recorded', 'Recorded file', 'A Zoom recording or any audio or video file.']
              ].map(([value, label, hint]) => `
                <label class="translator-mode">
                  <input type="radio" name="translatorMode" value="${value}"${mode === value ? ' checked' : ''}>
                  <span><strong>${label}</strong><small>${hint}</small></span>
                </label>
              `).join('')}
            </fieldset>

            <div class="field" data-translator-for="live-mic"${mode === 'live-mic' ? '' : ' hidden'}>
              <label for="translatorDevice">Microphone</label>
              <select id="translatorDevice" name="translatorDevice"${disabled}>
                <option value="">Default microphone</option>
              </select>
            </div>

            <div class="field" data-translator-for="recorded"${mode === 'recorded' ? '' : ' hidden'}>
              <label for="translatorFile">Audio or video file</label>
              <label class="translator-dropzone" id="translatorDropzone">
                <input id="translatorFile" name="translatorFile" type="file" accept="audio/*,video/*,.m4a,.mp3,.wav,.mp4,.webm,.ogg,.aac"${disabled}>
                <span id="translatorFileLabel">Drop a file here or click to choose (.m4a, .mp3, .wav, .mp4)</span>
              </label>
            </div>

            <details class="translator-help" data-translator-for="live-system"${mode === 'live-system' ? '' : ' hidden'}>
              <summary>Zoom app tips</summary>
              <ol>
                <li>Use Google Chrome. Join the meeting in the Zoom app as usual and keep its speaker volume up.</li>
                <li>Click <strong>Start translating</strong>, choose <strong>Entire screen</strong>, and turn on <strong>Also share system audio</strong> (needs macOS 14.2 or newer).</li>
                <li>Zoom in a Chrome tab instead? Choose that tab and turn on <strong>Also share tab audio</strong>.</li>
                <li>No audio switch? Install the free <a href="https://existential.audio/blackhole/" target="_blank" rel="noreferrer">BlackHole</a> driver, set Zoom's speaker to a Multi-Output Device that includes BlackHole, then use <strong>Microphone</strong> mode and pick "BlackHole 2ch". As a last resort, Microphone mode can simply hear your laptop speakers.</li>
              </ol>
            </details>

            <div class="translator-language-row">
              <div class="field">
                <label for="translatorSource">Speaker's language</label>
                <select id="translatorSource" name="translatorSource"${disabled}>
                  ${translatorLanguageOptions(config && config.sourceLanguages, active ? run.session.sourceLanguage : prefs.sourceLanguage)}
                </select>
              </div>
              <div class="field">
                <label for="translatorTarget">Translate to</label>
                <select id="translatorTarget" name="translatorTarget"${disabled}>
                  ${translatorLanguageOptions(config && config.targetLanguages, active ? run.session.targetLanguage : prefs.targetLanguage)}
                </select>
              </div>
            </div>

            <div class="field">
              <label for="translatorGlossary">Names and terms <span class="translator-optional">(optional, improves accuracy)</span></label>
              <textarea id="translatorGlossary" name="translatorGlossary" rows="3" maxlength="2000" placeholder="One per line, for example:&#10;Celavive = product brand, keep as is&#10;upline = keep as upline"${disabled}>${escapeHtml(active ? run.session.glossary : prefs.glossary)}</textarea>
            </div>

            ${controls}
            <p id="translatorFormStatus" class="form-status" role="status" aria-live="polite"></p>
          </form>

          ${renderZoomCaptionCard()}

          <div class="translator-history">
            <span class="section-kicker">History</span>
            <h3>Saved sessions</h3>
            <div id="translatorHistory"><p class="translator-muted">Loading...</p></div>
          </div>
        </section>

        <section class="workspace-panel translator-output" style="--translator-font: ${Number(prefs.fontSize) || 17}px">
          <div class="translator-reveal">
            <div class="translator-reveal-bar">
              <button type="button" data-translator-clean="off">Show controls</button>
              <button type="button" data-translator-fullscreen>Full screen</button>
            </div>
          </div>
          <div class="translator-output-head">
            <div class="translator-status-line">
              <span id="translatorPill">${renderTranslatorStatusPill(run)}</span>
              <span id="translatorMeter" class="translator-meter"${run && run.capture ? '' : ' hidden'}><span></span></span>
              <span id="translatorStats" class="translator-stats"></span>
              ${active && run.status !== 'stopping' ? `
                <span class="translator-focus-controls">
                  <button type="button" data-translator-action="pause" class="button-link button-link-secondary">${run.status === 'paused' ? 'Resume' : 'Pause'}</button>
                  <button type="button" data-translator-action="stop" class="button-link translator-stop">Stop</button>
                </span>` : ''}
            </div>
            <p id="translatorMessage" class="translator-message" role="status" aria-live="polite"></p>
            <div id="translatorProgress" class="translator-progress"${run && run.progress ? '' : ' hidden'}><span></span></div>
          </div>
          ${renderTranslatorToolbar(prefs, { live: true })}
          <div class="translator-stage">
            <div class="translator-video-pane" id="translatorVideoPane">
              <div class="translator-video-fit" id="translatorVideoFit">
                <div class="translator-video-frame" id="translatorVideoFrame">
                  <video id="translatorVideo" autoplay muted playsinline></video>
                  <div class="translator-video-empty" id="translatorVideoEmpty">
                    <p><strong>Show the speaker here</strong></p>
                    <p>Click <em>Choose speaker video</em> and pick the <strong>zoom.us</strong> window. Then use <em>Crop</em> to frame one person.</p>
                  </div>
                  <div class="translator-subtitles" id="translatorSubtitles" aria-live="polite"></div>
                  <div class="translator-crop-layer" id="translatorCropLayer" hidden>
                    <div class="translator-crop-box" id="translatorCropBox"></div>
                    <div class="translator-crop-bar">
                      <span>Drag a box around the speaker</span>
                      <button type="button" id="translatorCropApply">Use selection</button>
                      <button type="button" id="translatorCropReset">Whole window</button>
                      <button type="button" id="translatorCropCancel">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div id="translatorScroll" class="translator-scroll">
              <ol id="translatorTranscript" class="translator-transcript"></ol>
            </div>
          </div>
        </section>
      </section>
    `
  });
}

function attachTranslatorHandlers() {
  const form = document.getElementById('translatorForm');

  if (!form) {
    return;
  }

  const run = translatorStore.run;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void startTranslatorRun(form);
  });

  form.querySelectorAll('input[name="translatorMode"]').forEach((input) => {
    input.addEventListener('change', () => {
      const mode = form.querySelector('input[name="translatorMode"]:checked').value;
      form.querySelectorAll('[data-translator-for]').forEach((element) => {
        element.hidden = element.dataset.translatorFor !== mode;
      });
      setTranslatorPrefs({ mode });

      if (mode === 'live-mic') {
        void populateTranslatorDevices();
      }
    });
  });

  const fileInput = document.getElementById('translatorFile');
  const fileLabel = document.getElementById('translatorFileLabel');
  const dropzone = document.getElementById('translatorDropzone');

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];

    if (fileLabel) {
      fileLabel.textContent = file ? `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)` : 'Drop a file here or click to choose (.m4a, .mp3, .wav, .mp4)';
    }
  });

  dropzone?.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragging');
  });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('is-dragging'));
  dropzone?.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');

    if (event.dataTransfer && event.dataTransfer.files.length && fileInput) {
      fileInput.files = event.dataTransfer.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });

  document.getElementById('translatorFocusToggle')?.addEventListener('click', () => {
    setTranslatorFocus(!getTranslatorPrefs().focusMode);
  });
  attachPresentationHandlers();
  document.querySelectorAll('[data-translator-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.translatorAction === 'stop') {
        void stopTranslatorRun(translatorStore.run);
      } else {
        toggleRunPause(translatorStore.run);
      }
    });
  });

  document.getElementById('translatorStopButton')?.addEventListener('click', () => {
    void stopTranslatorRun(translatorStore.run);
  });
  document.getElementById('translatorPauseButton')?.addEventListener('click', () => {
    toggleRunPause(translatorStore.run);
  });
  document.getElementById('translatorAbandonButton')?.addEventListener('click', () => {
    void abandonQueue(translatorStore.run);
  });

  const resumeFile = document.getElementById('translatorResumeFile');
  resumeFile?.addEventListener('change', () => {
    const job = getResumeJob();
    const file = resumeFile.files && resumeFile.files[0];

    if (!job || !file) {
      return;
    }

    if (file.name !== job.fileName || file.size !== job.fileSize) {
      setTranslatorFormStatus(`That is a different file. Choose ${job.fileName} to continue.`, 'error');
      resumeFile.value = '';
      return;
    }

    void startRecordedRun({}, file, job);
  });
  document.getElementById('translatorResumeDiscard')?.addEventListener('click', () => {
    saveResumeJob(null);
    rerenderTranslatorPage();
  });

  attachTranscriptControls(() => translatorStore.run, () => updateTranslatorTranscript(translatorStore.run));
  attachZoomCaptionHandlers();

  document.getElementById('translatorTranscript')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-translator-retry]');

    if (button && translatorStore.run) {
      retryFailedSegments(translatorStore.run, Number(button.dataset.translatorRetry));
    }
  });

  if (getTranslatorPrefs().mode === 'live-mic' && !(run && isRunActive(run))) {
    void populateTranslatorDevices();
  }

  if (run) {
    updateTranslatorTranscript(run);
    updateTranslatorLive(run);
  } else {
    updateTranslatorTranscript(null);
  }

  if (translatorStore.sessions) {
    renderTranslatorHistory();
  }

  void loadTranslatorSessions().then(renderTranslatorHistory);
  refreshTranslatorSidebarIndicator();
}

// Hides the setup column and the app chrome so only the translation is on screen,
// for sharing this window in Zoom. Toggled in place so typed form values survive.
function setTranslatorFocus(enabled) {
  setTranslatorPrefs(enabled ? { focusMode: true } : { focusMode: false, cleanView: false });
  document.querySelector('.translator-layout')?.classList.remove('is-clean');
  const layout = document.querySelector('.translator-layout');
  const button = document.getElementById('translatorFocusToggle');

  layout?.classList.toggle('is-focus', enabled);

  if (button) {
    button.querySelector('span').textContent = enabled ? 'Exit presentation' : 'Presentation view';
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  }

  updateTranslatorTranscript(translatorStore.run);
  window.requestAnimationFrame(layoutSpeakerVideo);
}

document.addEventListener('click', (event) => {
  document.querySelectorAll('.translator-export[open]').forEach((menu) => {
    if (!menu.contains(event.target)) {
      menu.removeAttribute('open');
    }
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.querySelector('.translator-export[open]')) {
    document.querySelector('.translator-export[open]').removeAttribute('open');
    return;
  }

  if (event.key === 'Escape' && isOnTranslatorHome() && getTranslatorPrefs().cleanView && getTranslatorPrefs().focusMode) {
    setTranslatorClean(false);
    return;
  }

  if (event.key === 'Escape' && isOnTranslatorHome() && getTranslatorPrefs().focusMode) {
    setTranslatorFocus(false);
  }
});

function attachTranscriptControls(getSource, rerender) {
  document.getElementById('translatorShowOriginal')?.addEventListener('change', (event) => {
    setTranslatorPrefs({ showOriginal: event.target.checked });
    rerender();
  });
  document.getElementById('translatorAutoScroll')?.addEventListener('change', (event) => {
    setTranslatorPrefs({ autoScroll: event.target.checked });
  });
  document.querySelectorAll('[data-translator-font]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = Math.max(13, Math.min(30, (Number(getTranslatorPrefs().fontSize) || 17) + Number(button.dataset.translatorFont) * 2));
      setTranslatorPrefs({ fontSize: next });
      document.querySelector('.translator-output')?.style.setProperty('--translator-font', `${next}px`);
    });
  });
  document.querySelectorAll('[data-translator-export]').forEach((button) => {
    button.addEventListener('click', () => {
      const source = getSource();

      if (!source || !source.segments.length) {
        showTranslatorToast('Nothing to export yet.');
        return;
      }

      void exportTranslation(button.dataset.translatorExport, source.session, source.segments);
      button.closest('details')?.removeAttribute('open');
    });
  });
}

async function populateTranslatorDevices() {
  const select = document.getElementById('translatorDevice');

  if (!select || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return;
  }

  try {
    const saved = getTranslatorPrefs().deviceId;
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'audioinput' && device.deviceId && device.deviceId !== 'default');

    // Labels are hidden until the user has allowed the microphone once.
    select.innerHTML = '<option value="">Default microphone</option>' + devices
      .map((device, index) => `<option value="${escapeAttribute(device.deviceId)}"${device.deviceId === saved ? ' selected' : ''}>${escapeHtml(device.label || `Microphone ${index + 1}`)}</option>`)
      .join('');
  } catch (error) {
    // Keep the default option.
  }
}

function setTranslatorFormStatus(message, tone = 'info') {
  const status = document.getElementById('translatorFormStatus');

  if (status) {
    status.textContent = message;
    status.dataset.tone = tone;
    status.classList.toggle('is-error', tone === 'error');
  }
}

function updateTranslatorLevel(run) {
  const meter = document.querySelector('#translatorMeter > span');

  if (meter && translatorStore.run === run) {
    // Speech RMS is mostly 0.01 to 0.3; a log scale makes quiet speakers visible.
    const level = run.level > 0 ? Math.max(0, Math.min(1, (Math.log10(run.level) + 2.6) / 2.2)) : 0;
    meter.style.transform = `scaleX(${level.toFixed(3)})`;
  }
}

function updateTranslatorLive(run) {
  refreshTranslatorSidebarIndicator();

  if (!run || translatorStore.run !== run || !isOnTranslatorHome()) {
    return;
  }

  const pill = document.getElementById('translatorPill');
  const message = document.getElementById('translatorMessage');
  const stats = document.getElementById('translatorStats');
  const progress = document.getElementById('translatorProgress');

  if (pill) {
    pill.innerHTML = renderTranslatorStatusPill(run);
  }

  if (message) {
    message.textContent = run.message;
    message.dataset.tone = run.tone;
  }

  if (stats) {
    const parts = [];

    if (run.mode === 'recorded' && run.progress) {
      const done = run.doneSequences.size;
      parts.push(`Part ${Math.min(done + (run.inFlight ? 1 : 0), run.progress.total)} of ${run.progress.total}`);

      if (run.queue.length && run.status !== 'finished') {
        const rpm = (translatorStore.config && translatorStore.config.maxRequestsPerMinute) || 8;
        parts.push(`about ${Math.max(1, Math.ceil(run.queue.length / rpm))} min left`);
      }
    } else {
      parts.push(TranslatorAudio.formatTimestamp(getRunAudioSeconds(run)));

      if (run.queue.length > 1) {
        parts.push(`${run.queue.length} parts waiting`);
      }
    }

    if (run.failed.size) {
      parts.push(`${run.failed.size} not translated`);
    }

    stats.textContent = parts.join(' · ');
  }

  if (progress && run.progress) {
    progress.hidden = false;
    progress.firstElementChild.style.transform = `scaleX(${(run.doneSequences.size / Math.max(1, run.progress.total)).toFixed(3)})`;
  }

  updatePendingRows(run);
}

function updatePendingRows(run) {
  const list = document.getElementById('translatorTranscript');

  if (!list) {
    return;
  }

  const signature = `${run.segments.length}|${run.failed.size}|${run.inFlight ? run.inFlight.sequence : ''}`;

  if (list.dataset.signature !== signature) {
    updateTranslatorTranscript(run);
  }
}

function updateTranslatorTranscript(run) {
  const list = document.getElementById('translatorTranscript');
  const scroller = document.getElementById('translatorScroll');

  if (!list || (run && translatorStore.run !== run)) {
    return;
  }

  const prefs = getTranslatorPrefs();
  // Newest is on top, so "following along" means staying at the top.
  const nearTop = scroller ? scroller.scrollTop < 120 : true;

  list.innerHTML = renderTranslatorSegments({
    segments: run ? run.segments : [],
    failed: run ? [...run.failed.values()] : [],
    pending: run && run.inFlight ? [run.inFlight] : [],
    showSource: prefs.showOriginal,
    newestFirst: true
  });
  list.dataset.signature = run ? `${run.segments.length}|${run.failed.size}|${run.inFlight ? run.inFlight.sequence : ''}` : '';

  const latest = list.querySelector('.translator-segment.is-latest');
  const latestKey = run && run.segments.length ? String(run.segments[run.segments.length - 1].sequence) : '';

  if (latest && list.dataset.latestKey !== latestKey) {
    latest.classList.add('is-entering');
  }

  list.dataset.latestKey = latestKey;
  updateSubtitles(run);

  if (scroller && prefs.autoScroll && nearTop) {
    scroller.scrollTop = 0;
  }
}

function renderTranslatorHistory() {
  const container = document.getElementById('translatorHistory');

  if (!container) {
    return;
  }

  if (translatorStore.sessionsError && !translatorStore.sessions) {
    container.innerHTML = `<p class="translator-muted">${escapeHtml(translatorStore.sessionsError)}</p>`;
    return;
  }

  const sessions = translatorStore.sessions || [];

  if (!sessions.length) {
    container.innerHTML = '<p class="translator-muted">No saved sessions yet. Each session you translate is saved here automatically.</p>';
    return;
  }

  container.innerHTML = `
    <ul class="translator-history-list">
      ${sessions.map((session) => `
        <li>
          <a href="/translator/${encodeURIComponent(session.sessionId)}" data-link class="translator-history-item">
            <span class="translator-history-title">${escapeHtml(session.title)}</span>
            <span class="translator-history-meta">
              ${escapeHtml(new Date(session.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))}
              · ${escapeHtml(translatorLanguageName(session.sourceLanguage, 'source'))} to ${escapeHtml(translatorLanguageName(session.targetLanguage, 'target'))}
              ${session.durationSeconds ? `· ${escapeHtml(TranslatorAudio.formatTimestamp(session.durationSeconds))}` : ''}
              ${session.status === 'active' ? '· not finished' : ''}
            </span>
          </a>
        </li>
      `).join('')}
    </ul>
  `;
}

// ---------------------------------------------------------------------------
// Saved session page (/translator/:id)
// ---------------------------------------------------------------------------

function renderTranslatorSessionPage(sessionId, loaded) {
  const prefs = getTranslatorPrefs();
  const session = loaded && loaded.session;

  return renderAdminFrame({
    activeView: 'translator',
    user: state.session,
    eventCount: state.cachedEventCount,
    title: session ? session.title : 'Saved translation',
    subtitle: session
      ? `${new Date(session.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · ${translatorLanguageName(session.sourceLanguage, 'source')} to ${translatorLanguageName(session.targetLanguage, 'target')} · ${loaded.segments.length} part(s)`
      : 'Loading the saved session...',
    badge: 'Meeting translator',
    headerControls: renderHeaderBackLink('/translator', 'Back to translator'),
    content: !loaded
      ? '<section class="workspace-panel"><p class="translator-muted">Loading...</p></section>'
      : loaded.error
        ? `<section class="workspace-panel"><p class="translator-muted">${escapeHtml(loaded.error)}</p></section>`
        : `
          <section class="workspace-panel translator-output translator-saved" style="--translator-font: ${Number(prefs.fontSize) || 17}px">
            <form id="translatorRenameForm" class="translator-rename">
              <label for="translatorRenameInput" class="translator-sr-only">Session name</label>
              <input id="translatorRenameInput" type="text" maxlength="120" value="${escapeAttribute(session.title)}">
              <button type="submit" class="button-link button-link-secondary">Rename</button>
              <button type="button" id="translatorDeleteButton" class="button-link button-link-secondary translator-danger">Delete</button>
            </form>
            ${renderTranslatorToolbar(prefs)}
            <div class="translator-scroll">
              <ol id="translatorSavedTranscript" class="translator-transcript">
                ${renderTranslatorSegments({ segments: loaded.segments, showSource: prefs.showOriginal })}
              </ol>
            </div>
          </section>
        `
  });
}

async function showTranslatorSessionPage(sessionId) {
  renderPage(renderTranslatorSessionPage(sessionId, null));
  attachAdminShellHandlers();

  let loaded;

  try {
    await loadTranslatorConfig().catch(() => null);
    const result = await fetchJson(`/translator/sessions/${encodeURIComponent(sessionId)}`);
    loaded = { session: result.session, segments: result.segments || [] };
  } catch (error) {
    loaded = { error: 'This session could not be found. It may have been deleted.' };
  }

  if (normalizePath(window.location.pathname) !== `/translator/${sessionId}`) {
    return;
  }

  renderPage(renderTranslatorSessionPage(sessionId, loaded));
  attachAdminShellHandlers();
  refreshTranslatorSidebarIndicator();

  if (loaded.error) {
    return;
  }

  attachTranscriptControls(() => loaded, () => {
    const list = document.getElementById('translatorSavedTranscript');

    if (list) {
      list.innerHTML = renderTranslatorSegments({ segments: loaded.segments, showSource: getTranslatorPrefs().showOriginal });
    }
  });

  document.getElementById('translatorRenameForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = document.getElementById('translatorRenameInput').value.trim();

    if (!title) {
      return;
    }

    try {
      const result = await fetchJson(`/translator/sessions/${encodeURIComponent(sessionId)}`, { method: 'PATCH', body: { title } });
      loaded.session = { ...loaded.session, ...result.session };
      translatorStore.sessions = null;
      document.querySelector('.admin-header-copy h1').textContent = loaded.session.title;
      showTranslatorToast('Renamed.');
    } catch (error) {
      showTranslatorToast(error.message || 'Could not rename the session.');
    }
  });

  document.getElementById('translatorDeleteButton')?.addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Delete this translation?',
      message: `"${loaded.session.title}" and its full transcript will be permanently deleted.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });

    if (!confirmed) {
      return;
    }

    try {
      await fetchJson(`/translator/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      translatorStore.sessions = null;

      const resumeJob = getResumeJob();

      if (resumeJob && resumeJob.sessionId === sessionId) {
        saveResumeJob(null);
      }

      navigate('/translator');
    } catch (error) {
      showTranslatorToast(error.message || 'Could not delete the session.');
    }
  });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function translationFileName(session, extension) {
  const base = String(session.title || 'translation').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'translation';
  return `${base}.${extension}`;
}

function buildTranslationText(session, segments, { bilingual }) {
  const header = [
    session.title,
    `${new Date(session.createdAt).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}`,
    `${translatorLanguageName(session.sourceLanguage, 'source')} to ${translatorLanguageName(session.targetLanguage, 'target')}`,
    ''
  ];
  const body = segments.map((segment) => {
    const time = `[${TranslatorAudio.formatTimestamp(segment.startSeconds)}]`;

    if (!bilingual) {
      return `${time} ${segment.translation}`;
    }

    return `${time}\n${translatorLanguageName(session.targetLanguage, 'target')}: ${segment.translation}\nOriginal: ${segment.sourceText}`;
  });

  return [...header, ...body].join(bilingual ? '\n\n' : '\n');
}

function downloadTranslatorFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportTranslation(kind, session, segments) {
  if (kind === 'copy') {
    try {
      await navigator.clipboard.writeText(segments.map((segment) => segment.translation).join('\n\n'));
      showTranslatorToast('English translation copied.');
    } catch (error) {
      showTranslatorToast('Copy was blocked by the browser. Use the .txt download instead.');
    }

    return;
  }

  if (kind === 'txt' || kind === 'bilingual') {
    const bilingual = kind === 'bilingual';
    downloadTranslatorFile(translationFileName(session, bilingual ? 'bilingual.txt' : 'txt'), buildTranslationText(session, segments, { bilingual }), 'text/plain;charset=utf-8');
    return;
  }

  if (kind === 'srt') {
    downloadTranslatorFile(translationFileName(session, 'srt'), TranslatorAudio.buildSrt(segments), 'application/x-subrip;charset=utf-8');
    return;
  }

  if (kind === 'print') {
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      showTranslatorToast('Allow pop-ups for this site to print or save as PDF.');
      return;
    }

    const targetName = translatorLanguageName(session.targetLanguage, 'target');
    const sourceName = translatorLanguageName(session.sourceLanguage, 'source');
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(session.title)}</title>
      <style>
        body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 32px; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .meta { color: #555; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid #ddd; }
        th { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #555; }
        td.time { white-space: nowrap; color: #555; width: 56px; }
        td.src { color: #444; }
        tr { break-inside: avoid; }
      </style></head><body>
      <h1>${escapeHtml(session.title)}</h1>
      <div class="meta">${escapeHtml(new Date(session.createdAt).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' }))} · ${escapeHtml(sourceName)} to ${escapeHtml(targetName)}</div>
      <table><thead><tr><th>Time</th><th>${escapeHtml(targetName)}</th><th>Original (${escapeHtml(sourceName)})</th></tr></thead><tbody>
      ${segments.map((segment) => `<tr><td class="time">${escapeHtml(TranslatorAudio.formatTimestamp(segment.startSeconds))}</td><td>${escapeHtml(segment.translation)}</td><td class="src">${escapeHtml(segment.sourceText)}</td></tr>`).join('')}
      </tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
}

function showTranslatorToast(message) {
  let toast = document.getElementById('translatorToast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'translatorToast';
    toast.className = 'translator-toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showTranslatorToast.timer);
  showTranslatorToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

// ---------------------------------------------------------------------------
// Presentation view: speaker video, crop, layouts, subtitles
// ---------------------------------------------------------------------------

function attachPresentationHandlers() {
  document.querySelectorAll('[data-translator-layout]').forEach((button) => {
    button.addEventListener('click', () => setPresentLayout(button.dataset.translatorLayout));
  });
  document.querySelectorAll('[data-translator-clean]').forEach((button) => {
    button.addEventListener('click', () => setTranslatorClean(button.dataset.translatorClean === 'on'));
  });
  document.querySelectorAll('[data-translator-fullscreen]').forEach((button) => {
    button.addEventListener('click', toggleTranslatorFullscreen);
  });
  document.getElementById('translatorVideoButton')?.addEventListener('click', () => {
    void chooseSpeakerVideo();
  });
  document.getElementById('translatorVideoRemove')?.addEventListener('click', removeSpeakerVideo);
  document.getElementById('translatorCropButton')?.addEventListener('click', startVideoCrop);
  document.getElementById('translatorCropApply')?.addEventListener('click', () => finishVideoCrop('apply'));
  document.getElementById('translatorCropReset')?.addEventListener('click', () => finishVideoCrop('reset'));
  document.getElementById('translatorCropCancel')?.addEventListener('click', () => finishVideoCrop('cancel'));
  attachCropDragging();

  const fit = document.getElementById('translatorVideoFit');

  if (fit && 'ResizeObserver' in window) {
    translatorStore.videoObserver?.disconnect();
    translatorStore.videoObserver = new ResizeObserver(() => layoutSpeakerVideo());
    translatorStore.videoObserver.observe(fit);
  }

  attachSpeakerVideo();
  renderSubtitleText();
}

// Clean view hides the status line and toolbar during presentation; hovering
// the top edge (or pressing H) brings them back.
function setTranslatorClean(enabled) {
  setTranslatorPrefs({ cleanView: enabled });
  document.querySelector('.translator-layout')?.classList.toggle('is-clean', enabled);
  window.requestAnimationFrame(layoutSpeakerVideo);
}

function toggleTranslatorFullscreen() {
  const target = document.querySelector('.translator-output');

  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => {});
  } else if (target && target.requestFullscreen) {
    void target.requestFullscreen().catch(() => showTranslatorToast('Full screen is not available here.'));
  }
}

document.addEventListener('fullscreenchange', () => {
  document.querySelectorAll('[data-translator-fullscreen]').forEach((button) => {
    const label = button.querySelector('span') || button;
    label.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  });
  window.requestAnimationFrame(layoutSpeakerVideo);
});

document.addEventListener('keydown', (event) => {
  const typing = event.target.closest && event.target.closest('input, textarea, select, [contenteditable]');

  if (!typing && (event.key === 'h' || event.key === 'H') && isOnTranslatorHome() && getTranslatorPrefs().focusMode) {
    setTranslatorClean(!getTranslatorPrefs().cleanView);
  }
});

function setPresentLayout(layout) {
  setTranslatorPrefs({ presentLayout: layout });
  document.querySelector('.translator-layout')?.setAttribute('data-present', layout);
  document.querySelectorAll('[data-translator-layout]').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.translatorLayout === layout ? 'true' : 'false');
  });

  if (layout !== 'transcript' && !getTranslatorPrefs().focusMode) {
    setTranslatorFocus(true);
  }

  window.requestAnimationFrame(layoutSpeakerVideo);
}

async function chooseSpeakerVideo() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    showTranslatorToast('This browser cannot capture other windows. Use Google Chrome.');
    return;
  }

  let stream;

  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'window', frameRate: { ideal: 30 } },
      audio: false,
      selfBrowserSurface: 'exclude',
      surfaceSwitching: 'include'
    });
  } catch (error) {
    if (!error || error.name !== 'NotAllowedError') {
      showTranslatorToast(`Could not capture that window (${error.message}).`);
    }

    return;
  }

  removeSpeakerVideo({ keepCrop: true });
  translatorStore.speakerVideo = { stream };

  const [track] = stream.getVideoTracks();
  track?.addEventListener('ended', () => {
    if (translatorStore.speakerVideo && translatorStore.speakerVideo.stream === stream) {
      removeSpeakerVideo();
      showTranslatorToast('The speaker video stopped (window sharing ended).');
    }
  });

  if (getTranslatorPrefs().presentLayout === 'transcript') {
    setPresentLayout('side');
  }

  syncVideoButtons();
  attachSpeakerVideo();
}

function removeSpeakerVideo({ keepCrop = false } = {}) {
  const current = translatorStore.speakerVideo;

  if (current) {
    stopStream(current.stream);
  }

  translatorStore.speakerVideo = null;

  if (!keepCrop) {
    setTranslatorPrefs({ videoCrop: null });
  }

  const video = document.getElementById('translatorVideo');

  if (video) {
    video.srcObject = null;
  }

  syncVideoButtons();
  layoutSpeakerVideo();
}

function syncVideoButtons() {
  const hasVideo = Boolean(translatorStore.speakerVideo);
  const label = document.querySelector('#translatorVideoButton span');

  if (label) {
    label.textContent = hasVideo ? 'Change video' : 'Choose speaker video';
  }

  document.getElementById('translatorCropButton')?.toggleAttribute('hidden', !hasVideo);
  document.getElementById('translatorVideoRemove')?.toggleAttribute('hidden', !hasVideo);
  document.getElementById('translatorVideoPane')?.classList.toggle('has-video', hasVideo);
}

function attachSpeakerVideo() {
  const video = document.getElementById('translatorVideo');
  const current = translatorStore.speakerVideo;

  syncVideoButtons();

  if (!video) {
    return;
  }

  if (!current) {
    video.srcObject = null;
    layoutSpeakerVideo();
    return;
  }

  if (video.srcObject !== current.stream) {
    video.srcObject = current.stream;
  }

  video.onloadedmetadata = () => {
    void video.play().catch(() => {});
    layoutSpeakerVideo();
  };
  video.onresize = layoutSpeakerVideo;
  layoutSpeakerVideo();
}

// Sizes the frame to the cropped area's shape and shifts the video inside it, so
// only the chosen part of the Zoom window is shown.
function layoutSpeakerVideo() {
  const fit = document.getElementById('translatorVideoFit');
  const frame = document.getElementById('translatorVideoFrame');
  const video = document.getElementById('translatorVideo');

  if (!fit || !frame || !video) {
    return;
  }

  const cropping = Boolean(translatorStore.cropDraft);
  const crop = cropping ? { x: 0, y: 0, w: 1, h: 1 } : (getTranslatorPrefs().videoCrop || { x: 0, y: 0, w: 1, h: 1 });
  const hasVideo = Boolean(translatorStore.speakerVideo && video.videoWidth);
  const aspect = hasVideo ? (crop.w * video.videoWidth) / (crop.h * video.videoHeight) : 16 / 9;
  const maxWidth = fit.clientWidth;
  const maxHeight = fit.clientHeight;

  if (!maxWidth || !maxHeight) {
    return;
  }

  let width = maxWidth;
  let height = width / aspect;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }

  frame.style.width = `${Math.floor(width)}px`;
  frame.style.height = `${Math.floor(height)}px`;
  video.style.width = `${100 / crop.w}%`;
  video.style.height = `${100 / crop.h}%`;
  video.style.left = `${(-crop.x / crop.w) * 100}%`;
  video.style.top = `${(-crop.y / crop.h) * 100}%`;
}

function startVideoCrop() {
  if (!translatorStore.speakerVideo) {
    return;
  }

  translatorStore.cropDraft = getTranslatorPrefs().videoCrop || null;
  document.getElementById('translatorCropLayer')?.removeAttribute('hidden');
  layoutSpeakerVideo();
  drawCropBox();
}

function finishVideoCrop(action) {
  const draft = translatorStore.cropDraft;

  if (action === 'apply' && draft && draft.w > 0.03 && draft.h > 0.03) {
    setTranslatorPrefs({ videoCrop: draft });
  } else if (action === 'reset') {
    setTranslatorPrefs({ videoCrop: null });
  }

  translatorStore.cropDraft = null;
  document.getElementById('translatorCropLayer')?.setAttribute('hidden', '');
  layoutSpeakerVideo();
}

function drawCropBox() {
  const box = document.getElementById('translatorCropBox');
  const draft = translatorStore.cropDraft;

  if (!box) {
    return;
  }

  box.hidden = !draft;

  if (draft) {
    box.style.left = `${draft.x * 100}%`;
    box.style.top = `${draft.y * 100}%`;
    box.style.width = `${draft.w * 100}%`;
    box.style.height = `${draft.h * 100}%`;
  }
}

function attachCropDragging() {
  const layer = document.getElementById('translatorCropLayer');

  if (!layer) {
    return;
  }

  let start = null;
  const point = (event) => {
    const rect = layer.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  };

  layer.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.translator-crop-bar')) {
      return;
    }

    start = point(event);
    translatorStore.cropDraft = { x: start.x, y: start.y, w: 0, h: 0 };
    layer.setPointerCapture(event.pointerId);
    drawCropBox();
  });
  layer.addEventListener('pointermove', (event) => {
    if (!start) {
      return;
    }

    const now = point(event);
    translatorStore.cropDraft = {
      x: Math.min(start.x, now.x),
      y: Math.min(start.y, now.y),
      w: Math.abs(now.x - start.x),
      h: Math.abs(now.y - start.y)
    };
    drawCropBox();
  });
  layer.addEventListener('pointerup', () => {
    start = null;
  });
}

// Subtitles show the newest translation phrase by phrase, paced over the length
// of the audio it came from, like broadcast captions.
function splitSubtitleCues(text) {
  const sentences = String(text || '').match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [];
  const cues = [];
  let current = '';

  for (const sentence of sentences.map((entry) => entry.trim()).filter(Boolean)) {
    if (current && `${current} ${sentence}`.length > 90) {
      cues.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }

  if (current) {
    cues.push(current);
  }

  return cues;
}

function updateSubtitles(run) {
  const subtitle = translatorStore.subtitle;
  const latest = run && run.segments.length ? run.segments[run.segments.length - 1] : null;
  const key = latest ? `${latest.sequence}:${latest.translation.length}` : '';

  if (key === subtitle.key) {
    return;
  }

  subtitle.timers.forEach((timer) => window.clearTimeout(timer));
  subtitle.timers = [];
  subtitle.key = key;

  if (!latest) {
    subtitle.text = '';
    renderSubtitleText();
    return;
  }

  const cues = splitSubtitleCues(latest.translation);
  const span = Math.max(4, (Number(latest.endSeconds) || 0) - (Number(latest.startSeconds) || 0));
  const totalChars = cues.reduce((sum, cue) => sum + cue.length, 0) || 1;
  let delay = 0;

  cues.forEach((cue, index) => {
    const show = () => {
      subtitle.text = cue;
      renderSubtitleText();
    };

    if (index === 0) {
      show();
    } else {
      subtitle.timers.push(window.setTimeout(show, delay));
    }

    delay += Math.max(2500, span * 1000 * (cue.length / totalChars));
  });
}

function renderSubtitleText() {
  const element = document.getElementById('translatorSubtitles');

  if (!element) {
    return;
  }

  const text = translatorStore.subtitle.text;
  element.innerHTML = text
    ? `<span class="translator-subtitle-line">${escapeHtml(text)}</span>`
    : '<span class="translator-subtitle-line is-placeholder">Subtitles will appear here</span>';
}

// ---------------------------------------------------------------------------
// Zoom closed captions: send each translation to Zoom's CC so attendees see it
// as native Zoom subtitles. The link (API token) comes from the meeting host.
// ---------------------------------------------------------------------------

const TRANSLATOR_ZOOM_KEY = 'translatorZoomCaptions';
const ZOOM_RETRY_WINDOW_MS = 5000;

function getZoomState() {
  if (!translatorStore.zoom) {
    let saved = {};

    try {
      // Per tab: a caption link only lasts for one meeting.
      saved = JSON.parse(window.sessionStorage.getItem(TRANSLATOR_ZOOM_KEY) || '{}');
    } catch (error) {
      saved = {};
    }

    translatorStore.zoom = {
      url: saved.url || '',
      nextSeq: Number(saved.nextSeq) || 1,
      enabled: Boolean(saved.enabled && saved.url),
      status: saved.enabled && saved.url ? 'Connected. New translations will be sent to Zoom.' : '',
      tone: saved.enabled && saved.url ? 'success' : 'info',
      queue: [],
      sending: false,
      timers: [],
      sentCount: 0
    };
  }

  return translatorStore.zoom;
}

function saveZoomState() {
  const zoom = getZoomState();

  try {
    window.sessionStorage.setItem(TRANSLATOR_ZOOM_KEY, JSON.stringify({ url: zoom.url, nextSeq: zoom.nextSeq, enabled: zoom.enabled }));
  } catch (error) {
    // Only matters across reloads.
  }
}

function renderZoomCaptionCard() {
  const zoom = getZoomState();

  return `
    <div class="translator-zoom-card${zoom.enabled ? ' is-connected' : ''}" id="translatorZoomCard">
      <div class="translator-zoom-head">
        <div>
          <span class="section-kicker">Zoom captions</span>
          <h3>Show as Zoom subtitles</h3>
        </div>
        <span class="translator-zoom-dot" aria-hidden="true"></span>
      </div>
      <p class="translator-muted">Attendees see the translation in Zoom's own captions, with no screen sharing. You must be the host or co-host.</p>
      <div class="field">
        <label for="translatorZoomUrl">Zoom caption link (API token)</label>
        <input id="translatorZoomUrl" type="url" autocomplete="off" spellcheck="false" placeholder="https://wmcc.zoom.us/closedcaption?id=..." value="${escapeAttribute(zoom.url)}"${zoom.enabled ? ' readonly' : ''}>
      </div>
      <div class="translator-zoom-actions">
        <button type="button" id="translatorZoomConnect" class="translator-tool-button"${zoom.enabled ? ' hidden' : ''}>Connect</button>
        <button type="button" id="translatorZoomTest" class="translator-tool-button"${zoom.enabled ? '' : ' hidden'}>Send test caption</button>
        <button type="button" id="translatorZoomDisconnect" class="translator-tool-button"${zoom.enabled ? '' : ' hidden'}>Disconnect</button>
      </div>
      <p id="translatorZoomStatus" class="translator-zoom-status" data-tone="${escapeAttribute(zoom.tone)}">${escapeHtml(zoom.status)}</p>
      <details class="translator-help">
        <summary>How to get the link</summary>
        <ol>
          <li><strong>Once:</strong> sign in at zoom.us (as the account owner or admin) → Settings → Meeting → In Meeting (Advanced) → turn on <strong>Manual captions</strong> and tick <strong>Allow use of caption API Token to integrate with 3rd-party Closed Captioning services</strong>. Save.</li>
          <li><strong>Each meeting:</strong> as host or co-host, click the arrow next to <strong>Show Captions</strong> (CC) → <strong>Set up manual captioner</strong> → <strong>Copy the API token</strong>.</li>
          <li>Paste it above and click <strong>Connect</strong>, then <strong>Send test caption</strong>. Attendees may need to click <strong>Show Captions</strong> in Zoom to see them.</li>
        </ol>
      </details>
    </div>
  `;
}

function attachZoomCaptionHandlers() {
  document.getElementById('translatorZoomConnect')?.addEventListener('click', () => {
    void connectZoomCaptions(document.getElementById('translatorZoomUrl').value);
  });
  document.getElementById('translatorZoomTest')?.addEventListener('click', () => {
    enqueueZoomCaption('Live translation is connected.');
  });
  document.getElementById('translatorZoomDisconnect')?.addEventListener('click', disconnectZoomCaptions);
}

function setZoomStatus(status, tone) {
  const zoom = getZoomState();
  zoom.status = status;
  zoom.tone = tone;
  const element = document.getElementById('translatorZoomStatus');

  if (element) {
    element.textContent = status;
    element.dataset.tone = tone;
  }
}

function refreshZoomCard() {
  const card = document.getElementById('translatorZoomCard');

  if (card) {
    card.outerHTML = renderZoomCaptionCard();
    attachZoomCaptionHandlers();
  }
}

function describeZoomStatus(code) {
  if (code === 400) {
    return 'Zoom says the meeting has not started, or captions are off for it.';
  }

  if (code === 403) {
    return 'Zoom rejected the caption link. Copy a fresh API token from Zoom and connect again.';
  }

  if (code === 0) {
    return 'Could not reach Zoom.';
  }

  return `Zoom returned an error (${code}).`;
}

async function connectZoomCaptions(rawUrl) {
  const url = String(rawUrl || '').trim();
  const zoom = getZoomState();

  if (!url) {
    setZoomStatus('Paste the caption link from Zoom first.', 'error');
    return;
  }

  setZoomStatus('Connecting to Zoom...', 'info');
  const result = await translatorRequest('/translator/zoom-caption/check', { method: 'POST', body: { captionUrl: url }, timeoutMs: 10000 });

  if (result.status !== 200) {
    setZoomStatus(result.data.error || 'Could not check the link. Try again.', 'error');
    return;
  }

  if (!result.data.ok && (result.data.zoomStatus === 400 || result.data.zoomStatus === 403)) {
    setZoomStatus(describeZoomStatus(result.data.zoomStatus), 'error');
    return;
  }

  const sameLink = zoom.url === url;
  zoom.url = url;
  zoom.enabled = true;

  if (Number.isInteger(result.data.lastSeq)) {
    zoom.nextSeq = result.data.lastSeq + 1;
  } else if (!sameLink) {
    zoom.nextSeq = 1;
  }

  saveZoomState();
  refreshZoomCard();
  setZoomStatus(result.data.ok
    ? 'Connected. New translations will appear as Zoom captions. Use Send test caption to check.'
    : 'Link saved, but Zoom did not confirm it yet. Use Send test caption to check.', result.data.ok ? 'success' : 'warn');
  refreshTranslatorSidebarIndicator();
}

function disconnectZoomCaptions() {
  const zoom = getZoomState();
  zoom.enabled = false;
  zoom.queue = [];
  zoom.timers.forEach((timer) => window.clearTimeout(timer));
  zoom.timers = [];
  saveZoomState();
  refreshZoomCard();
  setZoomStatus('Disconnected. Translations are no longer sent to Zoom.', 'info');
}

// A translated part becomes several short captions, released over the length of
// the audio it came from so Zoom shows readable lines instead of one big block.
function queueZoomCaptions(segment) {
  const zoom = getZoomState();

  if (!zoom.enabled || !segment || !segment.translation) {
    return;
  }

  const cues = splitSubtitleCues(segment.translation);
  const span = Math.max(4, (Number(segment.endSeconds) || 0) - (Number(segment.startSeconds) || 0));
  const totalChars = cues.reduce((sum, cue) => sum + cue.length, 0) || 1;
  let delay = 0;

  cues.forEach((cue) => {
    zoom.timers.push(window.setTimeout(() => enqueueZoomCaption(cue), delay));
    delay += Math.max(2500, span * 1000 * (cue.length / totalChars));
  });
}

function enqueueZoomCaption(text) {
  const zoom = getZoomState();

  if (!zoom.enabled) {
    return;
  }

  zoom.queue.push(text);
  void pumpZoomCaptions();
}

async function pumpZoomCaptions() {
  const zoom = getZoomState();

  if (zoom.sending) {
    return;
  }

  zoom.sending = true;

  try {
    while (zoom.enabled && zoom.queue.length) {
      // If Zoom falls behind, skip to the newest lines; old captions are useless.
      if (zoom.queue.length > 4) {
        zoom.queue = zoom.queue.slice(-2);
      }

      const text = zoom.queue.shift();
      const outcome = await sendZoomCaption(zoom, text);

      if (outcome.ok) {
        zoom.nextSeq += 1;
        zoom.sentCount += 1;
        saveZoomState();
        setZoomStatus(`Connected · ${zoom.sentCount} caption(s) sent · last at ${new Date().toLocaleTimeString()}`, 'success');
      } else {
        setZoomStatus(`${describeZoomStatus(outcome.zoomStatus)} A caption was skipped.`, outcome.zoomStatus === 403 ? 'error' : 'warn');
      }
    }
  } finally {
    zoom.sending = false;
  }
}

// Zoom's guide: retry every failure with randomized binary exponential backoff,
// keeping the same seq, and move on after about 5 seconds.
async function sendZoomCaption(zoom, text) {
  const startedAt = Date.now();
  let attempt = 0;
  let last = { ok: false, zoomStatus: 0 };

  while (Date.now() - startedAt < ZOOM_RETRY_WINDOW_MS && zoom.enabled) {
    const result = await translatorRequest('/translator/zoom-caption', {
      method: 'POST',
      body: { captionUrl: zoom.url, seq: zoom.nextSeq, text },
      timeoutMs: 6000
    });

    if (result.status === 200 && result.data.ok) {
      return { ok: true };
    }

    last = { ok: false, zoomStatus: result.status === 200 ? result.data.zoomStatus : 0 };

    if (result.status === 400 || result.status === 401) {
      return last;
    }

    const wait = Math.random() * 100 * 2 ** attempt;
    attempt += 1;
    await new Promise((resolve) => window.setTimeout(resolve, wait));
  }

  return last;
}
