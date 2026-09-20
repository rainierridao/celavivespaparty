const test = require('node:test');
const assert = require('node:assert/strict');
const { __test } = require('../lib/mailer');

const from = { fromName: 'GeneSysPH Events', fromAddress: 'me@gmail.com', host: 'smtp.gmail.com' };

function decodePart(message, contentType) {
  const section = message.split(/--[^\r\n]+\r\n/).find((part) => part.includes(contentType));
  assert.ok(section, `no ${contentType} part found`);
  const body = section.split('\r\n\r\n').slice(1).join('\r\n\r\n');
  return Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8');
}

test('builds a plain multipart/alternative message', () => {
  const message = __test.buildMessage({
    from,
    to: 'payer@example.com',
    subject: 'Payment instructions',
    html: '<p>Pay <strong>PHP 500.00</strong></p>',
    text: '',
    attachments: []
  });

  assert.match(message, /^From: GeneSysPH Events <me@gmail.com>/m);
  assert.match(message, /^To: payer@example.com$/m);
  assert.match(message, /^Subject: Payment instructions$/m);
  assert.match(message, /Content-Type: multipart\/alternative/);
  assert.equal(decodePart(message, 'text/html'), '<p>Pay <strong>PHP 500.00</strong></p>');
  // A text fallback is derived so the mail is readable without HTML.
  assert.equal(decodePart(message, 'text/plain'), 'Pay PHP 500.00');
});

test('embeds an inline image with a Content-ID', () => {
  const message = __test.buildMessage({
    from,
    to: 'payer@example.com',
    subject: 'QR',
    html: '<img src="cid:paymentqr">',
    text: '',
    attachments: [{ cid: 'paymentqr', dataUrl: 'data:image/png;base64,iVBORw0KGgo=', fileName: 'qr.png' }]
  });

  assert.match(message, /Content-Type: multipart\/related/);
  assert.match(message, /Content-Type: image\/png; name="qr.png"/);
  assert.match(message, /Content-ID: <paymentqr>/);
  assert.match(message, /Content-Disposition: inline; filename="qr.png"/);
  assert.match(message, /iVBORw0KGgo=/);
});

test('encodes non-ASCII headers and rejects header injection', () => {
  assert.equal(__test.encodeHeaderWord('Plain Subject'), 'Plain Subject');
  assert.equal(__test.encodeHeaderWord('Piso · 500'), '=?UTF-8?B?UGlzbyDCtyA1MDA=?=');
  assert.equal(__test.encodeHeaderWord('He said "hi"'), 'He said hi');
});

test('only accepts base64 data URLs as attachments', () => {
  assert.deepEqual(__test.parseDataUrl('data:image/png;base64,AAAA'), {
    contentType: 'image/png',
    base64: 'AAAA'
  });
  assert.equal(__test.parseDataUrl('https://example.com/x.png'), null);
  assert.equal(__test.parseDataUrl('data:image/png,notbase64'), null);
});

test('explains a Gmail app-password failure in plain words', () => {
  assert.match(__test.describeSmtpFailure(535, '535 auth failed'), /app password/);
  assert.match(__test.describeSmtpFailure(550, '550 mailbox unavailable'), /550 mailbox unavailable/);
});
