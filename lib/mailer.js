const tls = require('tls');

// A very small SMTP client. The project ships with no dependencies, so rather
// than pulling in nodemailer this speaks just enough SMTP to send one message
// over an implicit-TLS connection (port 465), which is what Gmail expects when
// using an app password.

const SMTP_TIMEOUT_MS = 20_000;

function createMailer({ getEnv, createError }) {
  function getMailConfig() {
    const env = getEnv();
    const user = String(env.gmailUser || '').trim();
    const password = String(env.gmailAppPassword || '').replace(/\s+/g, '');

    return {
      user,
      password,
      host: String(env.smtpHost || '').trim() || 'smtp.gmail.com',
      port: Number.parseInt(String(env.smtpPort || '465'), 10) || 465,
      fromName: String(env.emailFromName || '').trim() || 'GeneSysPH Events',
      // Gmail rewrites the From header to the authenticated account anyway, so
      // the configured address is only a display preference.
      fromAddress: String(env.emailFrom || '').trim() || user
    };
  }

  function isMailConfigured() {
    const config = getMailConfig();
    return Boolean(config.user && config.password);
  }

  async function sendMail({ to, subject, html, text, attachments = [] }) {
    const config = getMailConfig();

    if (!config.user || !config.password) {
      const error = new Error(
        'Email is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to send messages.'
      );
      error.code = 'EMAIL_NOT_CONFIGURED';
      throw error;
    }

    const recipient = String(to || '').trim();

    if (!recipient) {
      throw createError(400, 'An email address is required.');
    }

    const message = buildMessage({
      from: config,
      to: recipient,
      subject: String(subject || '').trim(),
      html: String(html || ''),
      text: String(text || ''),
      attachments
    });

    await deliver({ config, to: recipient, message });
  }

  function deliver({ config, to, message }) {
    return new Promise((resolve, reject) => {
      const socket = tls.connect({
        host: config.host,
        port: config.port,
        servername: config.host
      });

      let buffer = '';
      let settled = false;
      // Each step sends a command and names the reply code it expects next.
      const steps = [
        { expect: 220, send: null },
        { expect: 250, send: `EHLO ${config.host}` },
        { expect: 334, send: 'AUTH LOGIN' },
        { expect: 334, send: Buffer.from(config.user).toString('base64') },
        { expect: 235, send: Buffer.from(config.password).toString('base64') },
        { expect: 250, send: `MAIL FROM:<${config.user}>` },
        { expect: 250, send: `RCPT TO:<${to}>` },
        { expect: 250, send: 'DATA' },
        { expect: 354, send: `${message}\r\n.` },
        { expect: 250, send: 'QUIT' }
      ];
      let stepIndex = 0;

      const finish = (error) => {
        if (settled) {
          return;
        }

        settled = true;
        socket.removeAllListeners();
        socket.destroy();

        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };

      socket.setTimeout(SMTP_TIMEOUT_MS, () => {
        finish(new Error('The mail server did not respond in time.'));
      });

      socket.on('error', (error) => {
        finish(new Error(`Could not reach the mail server: ${error.message}`));
      });

      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');

        // A reply may span several lines; only the last one omits the hyphen.
        while (true) {
          const match = buffer.match(/^(?:\d{3}-[^\n]*\n)*(\d{3}) [^\n]*\n/);

          if (!match) {
            return;
          }

          const code = Number.parseInt(match[1], 10);
          const reply = buffer.slice(0, match[0].length).trim();
          buffer = buffer.slice(match[0].length);

          const step = steps[stepIndex];

          if (!step) {
            finish();
            return;
          }

          if (code !== step.expect) {
            finish(new Error(describeSmtpFailure(code, reply)));
            return;
          }

          stepIndex += 1;
          const nextStep = steps[stepIndex];

          if (!nextStep) {
            finish();
            return;
          }

          socket.write(`${nextStep.send}\r\n`);

          // QUIT is the last command; some servers close before replying.
          if (nextStep.send === 'QUIT') {
            finish();
            return;
          }
        }
      });

      socket.on('close', () => {
        if (!settled) {
          finish(new Error('The mail server closed the connection unexpectedly.'));
        }
      });
    });
  }

  return { sendMail, isMailConfigured, getMailConfig };
}

function describeSmtpFailure(code, reply) {
  if (code === 535) {
    return 'Gmail rejected the login. Check GMAIL_USER and that GMAIL_APP_PASSWORD is a 16-character app password, not your normal password.';
  }

  if (code === 534) {
    return 'Gmail requires an app password for this account. Turn on 2-Step Verification, then create an app password.';
  }

  return `The mail server replied: ${reply}`;
}

function buildMessage({ from, to, subject, html, text, attachments }) {
  const boundary = `gpb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const inlineAttachments = attachments.filter((item) => item && item.dataUrl);
  const headers = [
    `From: ${encodeHeaderWord(from.fromName)} <${from.fromAddress}>`,
    `To: ${to}`,
    `Subject: ${encodeHeaderWord(subject)}`,
    'MIME-Version: 1.0',
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${boundary}@${from.host}>`
  ];

  const plainText = text || stripHtml(html);

  if (!inlineAttachments.length) {
    const altBoundary = `${boundary}_alt`;
    headers.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);

    return [
      headers.join('\r\n'),
      '',
      ...buildAlternativeParts(altBoundary, plainText, html),
      `--${altBoundary}--`
    ].join('\r\n');
  }

  // multipart/related keeps the images addressable from the HTML by Content-ID.
  headers.push(`Content-Type: multipart/related; boundary="${boundary}"`);
  const altBoundary = `${boundary}_alt`;
  const parts = [
    headers.join('\r\n'),
    '',
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    ...buildAlternativeParts(altBoundary, plainText, html),
    `--${altBoundary}--`,
    ''
  ];

  for (const attachment of inlineAttachments) {
    const parsed = parseDataUrl(attachment.dataUrl);

    if (!parsed) {
      continue;
    }

    parts.push(
      `--${boundary}`,
      `Content-Type: ${parsed.contentType}; name="${attachment.fileName || 'attachment'}"`,
      'Content-Transfer-Encoding: base64',
      `Content-ID: <${attachment.cid}>`,
      `Content-Disposition: inline; filename="${attachment.fileName || 'attachment'}"`,
      '',
      wrapBase64(parsed.base64),
      ''
    );
  }

  parts.push(`--${boundary}--`);
  return parts.join('\r\n');
}

function buildAlternativeParts(boundary, plainText, html) {
  return [
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(Buffer.from(plainText, 'utf8').toString('base64')),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(Buffer.from(html, 'utf8').toString('base64')),
    ''
  ];
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/);

  if (!match) {
    return null;
  }

  return { contentType: match[1], base64: match[2] };
}

function wrapBase64(value) {
  return String(value || '').replace(/.{1,76}/g, '$&\r\n').trimEnd();
}

// Non-ASCII subjects and display names need encoded-words to survive transit.
function encodeHeaderWord(value) {
  const text = String(value || '');

  if (/^[\x20-\x7E]*$/.test(text)) {
    return text.replace(/["\\]/g, '');
  }

  return `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h1|h2|h3)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = {
  createMailer,
  __test: { buildMessage, parseDataUrl, stripHtml, encodeHeaderWord, describeSmtpFailure }
};
