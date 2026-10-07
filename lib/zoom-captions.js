// Relays translated captions to a Zoom meeting through Zoom's third-party closed
// caption API. Browsers cannot post to Zoom's caption URL directly (no CORS), so
// the page sends each caption here and this forwards it.
// Format: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0060368

const ZOOM_TIMEOUT_MS = 4000;
const MAX_CAPTION_LENGTH = 1000;

function captionError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Only Zoom's own caption endpoints are accepted, so this cannot be used to post
// to arbitrary URLs.
function normalizeCaptionUrl(raw) {
  let url;

  try {
    url = new URL(String(raw || '').trim());
  } catch (error) {
    throw captionError(400, 'That does not look like a Zoom caption link. In Zoom, use Captions > Set up manual captioner > Copy the API token.');
  }

  const host = url.hostname.toLowerCase();
  const isZoomHost = /(^|\.)zoom\.us$/.test(host) || /(^|\.)zoomgov\.com$/.test(host);

  if (!isZoomHost || !/^\/closedcaption\/?$/.test(url.pathname) || !url.searchParams.get('id') || !url.searchParams.get('signature')) {
    throw captionError(400, 'That does not look like a Zoom caption link. In Zoom, use Captions > Set up manual captioner > Copy the API token.');
  }

  url.protocol = 'https:';
  url.port = '';
  url.searchParams.delete('seq');
  url.pathname = '/closedcaption';
  return url;
}

async function zoomFetch(url, options, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(url, { ...options, signal: controller.signal });
    const body = await res.text().catch(() => '');
    return { zoomStatus: res.status, ok: res.ok, body: body.trim().slice(0, 200) };
  } catch (error) {
    return { zoomStatus: 0, ok: false, body: '', timedOut: error && error.name === 'AbortError' };
  } finally {
    clearTimeout(timer);
  }
}

async function postZoomCaption({ captionUrl, seq, text }, { fetchImpl = fetch, timeoutMs = ZOOM_TIMEOUT_MS } = {}) {
  const url = normalizeCaptionUrl(captionUrl);
  const sequence = Number.parseInt(seq, 10);
  const caption = String(text || '').replace(/\r/g, '').trim().slice(0, MAX_CAPTION_LENGTH);

  if (!Number.isInteger(sequence) || sequence < 0) {
    throw captionError(400, 'Caption sequence number is missing.');
  }

  if (!caption) {
    throw captionError(400, 'Caption text is empty.');
  }

  url.searchParams.set('seq', String(sequence));
  const result = await zoomFetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8', Accept: '*/*' },
    body: caption
  }, fetchImpl, timeoutMs);

  return { ...result, timestamp: result.ok ? result.body : '' };
}

// Zoom reports the last sequence number it accepted for this meeting, so a new
// connection (or a page reload) continues the count instead of being rejected.
async function getZoomCaptionSeq({ captionUrl }, { fetchImpl = fetch, timeoutMs = ZOOM_TIMEOUT_MS } = {}) {
  const url = normalizeCaptionUrl(captionUrl);
  url.pathname = '/closedcaption/seq';
  const result = await zoomFetch(url.toString(), { method: 'GET', headers: { Accept: '*/*' } }, fetchImpl, timeoutMs);
  const lastSeq = Number.parseInt(result.body, 10);

  return { ...result, lastSeq: Number.isInteger(lastSeq) ? lastSeq : null };
}

module.exports = {
  getZoomCaptionSeq,
  normalizeCaptionUrl,
  postZoomCaption
};
