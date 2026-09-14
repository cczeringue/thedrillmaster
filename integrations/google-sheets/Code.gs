// Deploy as a web app executing as the owner. Only authenticated POSTs write rows.
// The deployment copy contains the SHA-256 digest, never the server's secret token.
var RSVP_SHEET_ID = '1GcwjfXeuGiZPxxuWmw8xuKBf6QO2zgYG6a8ZkSNkPKo';
var RSVP_TOKEN_SHA256 = 'REPLACE_WITH_SHA256_DIGEST';
var RSVP_HEADERS = ['Name', 'Email', 'Tickets needed', 'Received at', 'RSVP reference'];

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function authorized_(token) {
  if (typeof token !== 'string' || token.length > 128) return false;
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token, Utilities.Charset.UTF_8)
    .map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
  var difference = digest.length ^ RSVP_TOKEN_SHA256.length;
  for (var i = 0; i < digest.length; i++) difference |= digest.charCodeAt(i) ^ RSVP_TOKEN_SHA256.charCodeAt(i);
  return difference === 0;
}

function sheet_() {
  var sheet = SpreadsheetApp.openById(RSVP_SHEET_ID).getSheetByName('RSVPs');
  if (!sheet || JSON.stringify(sheet.getRange(1, 1, 1, 5).getValues()[0]) !== JSON.stringify(RSVP_HEADERS)) {
    throw new Error('RSVP sheet headers are missing.');
  }
  return sheet;
}

function literal_(text) {
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function verifyConfiguration() {
  sheet_();
  if (!/^[a-f0-9]{64}$/.test(RSVP_TOKEN_SHA256)) throw new Error('Set the token digest before deploying.');
  console.log('RSVP sheet and token digest are configured. No guest data was changed.');
}

function doGet() {
  return json_({ ok: false, error: 'POST required.' });
}

function doPost(event) {
  var lock;
  try {
    var raw = event && event.postData && event.postData.contents;
    if (typeof raw !== 'string' || raw.length > 4096) return json_({ ok: false, error: 'Invalid request.' });
    var input = JSON.parse(raw);
    if (!input || typeof input !== 'object' || !authorized_(input.token)) return json_({ ok: false, error: 'Unauthorized.' });
    if (input.action) return emailAction_(input);
    var keys = Object.keys(input).sort().join(',');
    if (keys !== 'email,guests,id,name,token') return json_({ ok: false, error: 'Invalid fields.' });
    if (typeof input.name !== 'string' || typeof input.email !== 'string') return json_({ ok: false, error: 'Invalid details.' });
    var name = input.name.trim();
    var email = input.email.trim().toLowerCase();
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.id) ||
        !name || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        (input.guests !== 1 && input.guests !== 2)) return json_({ ok: false, error: 'Invalid details.' });

    lock = LockService.getScriptLock();
    lock.waitLock(10000);
    var sheet = sheet_();
    var last = sheet.getLastRow();
    var existing = last > 1 ? sheet.getRange(2, 5, last - 1, 1).createTextFinder(input.id).matchEntireCell(true).findNext() : null;
    if (existing) {
      var row = sheet.getRange(existing.getRow(), 1, 1, 5).getDisplayValues()[0];
      return json_({ ok: true, reference: input.id, name: row[0], guests: Number(row[2]) });
    }
    if (last >= sheet.getMaxRows()) sheet.insertRowsAfter(last, 100);
    sheet.getRange(last + 1, 1, 1, 5).setValues([[literal_(name), literal_(email), input.guests, new Date(), input.id]]);
    SpreadsheetApp.flush();
    return json_({ ok: true, reference: input.id, name: name, guests: input.guests });
  } catch (error) {
    console.error('RSVP storage failed.');
    return json_({ ok: false, error: 'Your RSVP could not be saved. Please try again.' });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

// Email metadata is kept in Script Properties, leaving the guest sheet unchanged.
// A claim is held while Vercel sends, and Brevo deduplicates by the RSVP UUID.
function emailAction_(input) {
  var lock = LockService.getScriptLock();
  var uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if (!uuid.test(input.id || '') || !uuid.test(input.claimId || '')) return json_({ ok: false });
  if (input.action !== 'claim-email' && input.action !== 'finish-email') return json_({ ok: false });
  try {
    lock.waitLock(10000);
    var sheet = sheet_();
    var last = sheet.getLastRow();
    var cell = last > 1 ? sheet.getRange(2, 5, last - 1, 1).createTextFinder(input.id).matchEntireCell(true).findNext() : null;
    if (!cell) return json_({ ok: false });
    var properties = PropertiesService.getScriptProperties();
    var key = 'confirmation:' + input.id;
    var state = JSON.parse(properties.getProperty(key) || '{}');
    var now = Date.now();
    if (state.status === 'sent') return json_({ ok: true, status: 'sent' });
    if (input.action === 'finish-email') {
      if (state.claimId !== input.claimId || ['sent', 'failed', 'uncertain'].indexOf(input.status) < 0 ||
          typeof input.messageId !== 'string' || input.messageId.length > 300) return json_({ ok: false });
      state.status = input.status;
      state.messageId = input.messageId;
      state.updatedAt = now;
      properties.setProperty(key, JSON.stringify(state));
      return json_({ ok: true, status: state.status });
    }
    // Never guess whether an old uncertain request was delivered after provider deduplication expires.
    if ((state.status === 'sending' || state.status === 'uncertain') && now - state.firstAttemptAt > 25 * 60000) {
      return json_({ ok: true, status: 'needs_review' });
    }
    if (state.status === 'sending' && state.claimId !== input.claimId && now - state.updatedAt < 120000) {
      return json_({ ok: true, status: 'pending' });
    }
    var row = sheet.getRange(cell.getRow(), 1, 1, 5).getDisplayValues()[0];
    properties.setProperty(key, JSON.stringify({ status: 'sending', claimId: input.claimId,
      firstAttemptAt: state.status === 'failed' ? now : (state.firstAttemptAt || now), updatedAt: now }));
    return json_({ ok: true, status: 'claimed', reference: input.id, name: row[0], email: row[1], guests: Number(row[2]) });
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}
