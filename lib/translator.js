// Speech translation through the Gemini API (free tier friendly).
// One call per audio chunk: Gemini listens to the audio, writes the original
// transcript, and translates it, so there is no separate speech-to-text service.

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_PRIMARY_MODEL = 'gemini-3.5-flash';
const DEFAULT_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
// Netlify functions stop at 10 s by default, so each model attempt gets a hard cap
// and the whole chunk keeps a little room for the save that follows.
const ATTEMPT_TIMEOUT_MS = 7000;
const MAX_AUDIO_BASE64_LENGTH = 4_500_000;
const MAX_GLOSSARY_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 1500;

const SOURCE_LANGUAGES = {
  auto: 'Auto-detect (Philippine languages and English)',
  ceb: 'Cebuano (Bisaya / Binisaya)',
  fil: 'Filipino / Tagalog',
  hil: 'Hiligaynon (Ilonggo)',
  war: 'Waray (Winaray)',
  ilo: 'Ilocano',
  en: 'English',
  es: 'Spanish',
  zh: 'Mandarin Chinese',
  ja: 'Japanese',
  ko: 'Korean'
};

const TARGET_LANGUAGES = {
  en: 'English',
  fil: 'Filipino / Tagalog',
  ceb: 'Cebuano (Bisaya)',
  es: 'Spanish',
  zh: 'Mandarin Chinese',
  ja: 'Japanese',
  ko: 'Korean'
};

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    sourceText: { type: 'STRING' },
    translation: { type: 'STRING' },
    detectedLanguage: { type: 'STRING' },
    hasSpeech: { type: 'BOOLEAN' }
  },
  required: ['sourceText', 'translation', 'hasSpeech']
};

function getTranslatorConfig(env = process.env) {
  return {
    apiKey: String(env.GEMINI_API_KEY || '').trim(),
    primaryModel: String(env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL).trim(),
    fallbackModel: String(env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL).trim(),
    maxRequestsPerMinute: Math.max(1, Number.parseInt(env.TRANSLATOR_MAX_RPM || '8', 10) || 8)
  };
}

function normalizeLanguageCode(value, allowed, fallback) {
  const code = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(allowed, code) ? code : fallback;
}

function buildSystemInstruction({ sourceLanguage, targetLanguage, glossary }) {
  const sourceName = SOURCE_LANGUAGES[sourceLanguage] || SOURCE_LANGUAGES.auto;
  const targetName = TARGET_LANGUAGES[targetLanguage] || TARGET_LANGUAGES.en;
  const lines = [
    'You are a professional conference interpreter and transcriber for business trainings in the Philippines.',
    `The speaker's main language is: ${sourceName}.`,
    `Translate into: ${targetName}.`,
    '',
    'Rules:',
    '1. sourceText: transcribe exactly what was said, in the original language(s), with natural punctuation. Keep code-switching as spoken (Cebuano, Tagalog and English are often mixed). Do not translate in this field.',
    `2. translation: a faithful, fluent, professional ${targetName} rendering of the full meaning. Do not summarize, skip, or add content. Turn filler words and false starts into clean sentences without changing the meaning.`,
    '3. Keep personal names, company names, product names, numbers, prices, dates and percentages exactly as spoken.',
    '4. Translate idioms and Bisaya expressions by meaning, not word for word.',
    '5. If the audio is silence, music, or noise with no clear speech, set hasSpeech to false and leave both text fields empty. Never invent speech.',
    '6. If a word is unclear, write your best guess followed by [?] instead of dropping it.',
    '7. The audio may start or end mid-sentence because it is one piece of a longer recording. Transcribe only what is in this audio.'
  ];

  if (glossary) {
    lines.push('', 'Glossary from the user (always follow it):', glossary);
  }

  return lines.join('\n');
}

function buildUserPrompt(previousContext) {
  const parts = ['Transcribe and translate this audio segment. Reply with JSON only.'];

  if (previousContext) {
    parts.push(
      '',
      'For context only, this is what was said just before this segment (do not repeat or translate it again):',
      previousContext
    );
  }

  return parts.join('\n');
}

function buildThinkingConfig(model) {
  // Thinking adds seconds of latency and nothing useful for transcription.
  if (/^gemini-2\.5-/.test(model)) {
    return { thinkingBudget: 0 };
  }

  if (/^gemini-3/.test(model)) {
    return { thinkingLevel: 'minimal' };
  }

  return null;
}

function buildGeminiRequestBody({ audioBase64, mimeType, sourceLanguage, targetLanguage, glossary, previousContext, model, includeThinking = true }) {
  const generationConfig = {
    temperature: 0.2,
    responseMimeType: 'application/json',
    responseSchema: RESPONSE_SCHEMA
  };
  const thinkingConfig = includeThinking ? buildThinkingConfig(model) : null;

  if (thinkingConfig) {
    generationConfig.thinkingConfig = thinkingConfig;
  }

  return {
    systemInstruction: {
      parts: [{ text: buildSystemInstruction({ sourceLanguage, targetLanguage, glossary }) }]
    },
    contents: [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: mimeType, data: audioBase64 } },
          { text: buildUserPrompt(previousContext) }
        ]
      }
    ],
    generationConfig
  };
}

function parseGeminiResponse(payload) {
  const candidate = payload && Array.isArray(payload.candidates) ? payload.candidates[0] : null;

  if (!candidate) {
    const blockReason = payload && payload.promptFeedback && payload.promptFeedback.blockReason;
    if (blockReason) {
      throw translatorError(422, `The AI refused this segment (${blockReason}).`, { retryable: false });
    }

    throw translatorError(502, 'The AI returned no result for this segment.', { retryable: true });
  }

  const text = ((candidate.content && candidate.content.parts) || [])
    .map((part) => part.text || '')
    .join('')
    .trim();

  if (!text) {
    throw translatorError(502, 'The AI returned an empty result for this segment.', { retryable: true });
  }

  let parsed;

  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  } catch (error) {
    throw translatorError(502, 'The AI returned an unreadable result for this segment.', { retryable: true });
  }

  const sourceText = String(parsed.sourceText || '').trim();
  const translation = String(parsed.translation || '').trim();
  const hasSpeech = parsed.hasSpeech !== false && Boolean(sourceText || translation);

  return {
    sourceText: hasSpeech ? sourceText : '',
    translation: hasSpeech ? translation : '',
    detectedLanguage: String(parsed.detectedLanguage || '').trim(),
    hasSpeech
  };
}

function translatorError(statusCode, message, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
}

function describeGeminiFailure(status, apiMessage) {
  if (status === 429) {
    return translatorError(429, 'The free AI quota is used up for now. Translation will continue automatically when it frees up (per-minute limits reset in about a minute; daily limits reset at midnight US Pacific time).', { retryable: true, quota: true });
  }

  if (status === 400 && /api key/i.test(apiMessage)) {
    return translatorError(500, 'The Gemini API key is invalid. Check GEMINI_API_KEY in the server settings.', { retryable: false });
  }

  if (status === 401 || status === 403) {
    return translatorError(500, 'The Gemini API key was rejected. Check GEMINI_API_KEY in the server settings.', { retryable: false });
  }

  if (status === 404) {
    return translatorError(500, `The AI model is not available (${apiMessage || 'not found'}). Check GEMINI_MODEL in the server settings.`, { retryable: false, modelMissing: true });
  }

  if (status >= 500) {
    return translatorError(503, 'The AI service is busy right now. Retrying.', { retryable: true });
  }

  return translatorError(422, `The AI could not process this segment${apiMessage ? `: ${apiMessage}` : '.'}`, { retryable: false });
}

async function callGeminiModel({ apiKey, model, body, fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;

  try {
    res = await fetchImpl(`${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw translatorError(504, 'The AI took too long on this segment. Retrying.', { retryable: true, timeout: true });
    }

    throw translatorError(503, 'Could not reach the AI service. Retrying.', { retryable: true });
  } finally {
    clearTimeout(timer);
  }

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const apiMessage = String((payload && payload.error && payload.error.message) || '').slice(0, 300);
    const error = describeGeminiFailure(res.status, apiMessage);
    error.apiMessage = apiMessage;
    error.upstreamStatus = res.status;
    throw error;
  }

  return parseGeminiResponse(payload);
}

// Tries the primary model, then the fallback model, which has its own free quota.
// Retries across chunks are the browser queue's job; this keeps one request inside
// the serverless time limit.
async function translateAudioChunk(input, { config = getTranslatorConfig(), fetchImpl = fetch, timeoutMs = ATTEMPT_TIMEOUT_MS, deadlineMs = 7500 } = {}) {
  if (!config.apiKey) {
    throw translatorError(500, 'The translator is not set up yet. Add GEMINI_API_KEY to the server settings (free key: aistudio.google.com/apikey).', { retryable: false });
  }

  const audioBase64 = String(input.audioBase64 || '').replace(/^data:[^,]*,/, '');

  if (!audioBase64) {
    throw translatorError(400, 'No audio was received for this segment.', { retryable: false });
  }

  if (audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
    throw translatorError(400, 'This audio segment is too large. Use shorter segments.', { retryable: false });
  }

  const request = {
    audioBase64,
    mimeType: /^audio\/[\w.+-]+$/.test(String(input.mimeType || '')) ? input.mimeType : 'audio/wav',
    sourceLanguage: normalizeLanguageCode(input.sourceLanguage, SOURCE_LANGUAGES, 'ceb'),
    targetLanguage: normalizeLanguageCode(input.targetLanguage, TARGET_LANGUAGES, 'en'),
    glossary: String(input.glossary || '').trim().slice(0, MAX_GLOSSARY_LENGTH),
    previousContext: String(input.previousContext || '').trim().slice(-MAX_CONTEXT_LENGTH)
  };
  const models = [config.primaryModel, config.fallbackModel].filter((model, index, list) => model && list.indexOf(model) === index);
  const startedAt = Date.now();
  let lastError = null;

  for (const model of models) {
    const remaining = deadlineMs - (Date.now() - startedAt);

    if (remaining < 2500) {
      break;
    }

    const attemptTimeout = Math.min(timeoutMs, remaining);

    try {
      const result = await callWithThinkingFallback({ apiKey: config.apiKey, model, request, fetchImpl, timeoutMs: attemptTimeout });
      return { ...result, model };
    } catch (error) {
      lastError = error;

      // A bad key is the same for every model; anything else may work on the fallback.
      if (error.retryable === false && !error.modelMissing && error.upstreamStatus !== 400) {
        throw error;
      }
    }
  }

  throw lastError || translatorError(503, 'The AI service is busy right now. Retrying.', { retryable: true });
}

async function callWithThinkingFallback({ apiKey, model, request, fetchImpl, timeoutMs }) {
  try {
    return await callGeminiModel({ apiKey, model, body: buildGeminiRequestBody({ ...request, model }), fetchImpl, timeoutMs });
  } catch (error) {
    // Thinking settings differ between model generations; drop them if this model rejects them.
    if (error.upstreamStatus === 400 && /thinking/i.test(error.apiMessage || '') && buildThinkingConfig(model)) {
      return callGeminiModel({ apiKey, model, body: buildGeminiRequestBody({ ...request, model, includeThinking: false }), fetchImpl, timeoutMs });
    }

    throw error;
  }
}

module.exports = {
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  buildGeminiRequestBody,
  buildSystemInstruction,
  getTranslatorConfig,
  normalizeLanguageCode,
  parseGeminiResponse,
  translateAudioChunk
};
