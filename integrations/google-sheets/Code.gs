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

// Team notes may precede the table and columns may be rearranged. Resolve the
// labelled table on each request rather than treating a cell address as a schema.
function sheet_() {
  var sheet = SpreadsheetApp.openById(RSVP_SHEET_ID).getSheetByName('RSVPs');
  if (!sheet || !sheet.getLastRow() || !sheet.getLastColumn()) throw new Error('RSVP table is missing.');
  var width = sheet.getLastColumn();
  var rows = sheet.getRange(1, 1, Math.min(sheet.getLastRow(), 100), width).getDisplayValues();
  var expected = RSVP_HEADERS.map(function (label) { return label.toLowerCase(); });
  var matches = [];
  rows.forEach(function (row, index) {
    var labels = row.map(function (cell) { return String(cell).trim().toLowerCase(); });
    var columns = expected.map(function (label) { return labels.indexOf(label); });
    if (columns.every(function (column) { return column >= 0; })) {
      if (expected.some(function (label) { return labels.indexOf(label) !== labels.lastIndexOf(label); })) {
        throw new Error('RSVP table has duplicate column headings.');
      }
      matches.push({ sheet: sheet, headerRow: index + 1, columns: columns, width: width });
    }
  });
  if (matches.length !== 1) throw new Error('RSVP table headings are missing or ambiguous.');
  return matches[0];
}

function findReference_(table, id) {
  var first = table.headerRow + 1;
  var count = table.sheet.getLastRow() - table.headerRow;
  return count > 0 ? table.sheet.getRange(first, table.columns[4] + 1, count, 1)
    .createTextFinder(id).matchEntireCell(true).findNext() : null;
}

function readGuest_(table, rowNumber) {
  var row = table.sheet.getRange(rowNumber, 1, 1, table.width).getDisplayValues()[0];
  return table.columns.map(function (column) { return row[column]; });
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
    var table = sheet_();
    var sheet = table.sheet;
    var last = sheet.getLastRow();
    var existing = findReference_(table, input.id);
    if (existing) {
      var row = readGuest_(table, existing.getRow());
      return json_({ ok: true, reference: input.id, name: row[0], guests: Number(row[2]) });
    }
    if (last >= sheet.getMaxRows()) sheet.insertRowsAfter(last, 100);
    var values = new Array(table.width).fill('');
    [literal_(name), literal_(email), input.guests, new Date(), input.id].forEach(function (value, index) {
      values[table.columns[index]] = value;
    });
    sheet.getRange(last + 1, 1, 1, table.width).setValues([values]);
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
    var table = sheet_();
    var cell = findReference_(table, input.id);
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
    var row = readGuest_(table, cell.getRow());
    properties.setProperty(key, JSON.stringify({ status: 'sending', claimId: input.claimId,
      firstAttemptAt: state.status === 'failed' ? now : (state.firstAttemptAt || now), updatedAt: now }));
    return json_({ ok: true, status: 'claimed', reference: input.id, name: row[0], email: row[1], guests: Number(row[2]) });
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}
