import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { saveToGoogleSheet } from './sheets-rsvp.js';
import { rsvpSchema } from '../VIP/lib/rsvp-validation.js';

const WEBSITE = 'https://www.thedrillmaster.gay/';
const LISTING = 'https://www.elysiantheater.com/shows/thedrillmaster1013';
const CONTACT = 'thedrillmasterplay@gmail.com';
const ICS_URL = `${WEBSITE}VIP/assets/the-drillmaster.ics`;
const calendar = readFileSync(new URL('../public/VIP/assets/the-drillmaster.ics', import.meta.url), 'utf8');
const googleCalendar = `https://calendar.google.com/calendar/render?${new URLSearchParams({
  action: 'TEMPLATE', text: 'The Drillmaster at The Elysian',
  dates: '20261014T023000Z/20261014T034500Z', ctz: 'America/Los_Angeles',
  location: 'The Elysian, 1944 Riverside Drive, Los Angeles, CA 90039',
  details: `America’s Gayest Founding Daddy. A developmental preview.\nDoors open at 7:00 PM. Show at 7:30 PM Pacific.\nCreator's list tickets are available at no charge at the door under the name used to RSVP.\nWebsite: ${WEBSITE}\nThe Elysian: ${LISTING}\nQuestions or changes: ${CONTACT}`,
})}`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function buildConfirmationEmail(guest) {
  const name = escapeHtml(guest.name);
  const tickets = `${guest.guests} ${guest.guests === 1 ? 'ticket' : 'tickets'}`;
  const subject = `You’re on the Creator's list | The Drillmaster · Oct 13`;
  const preheader = `${tickets} at no charge. Tuesday, October 13 at 7:30 PM, The Elysian. Doors at 7:00 PM.`;
  const htmlContent = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(subject)}</title>
<style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0;mso-table-rspace:0}table{border-collapse:collapse}img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none}a{color:#1f1618} @media(max-width:620px){.shell{width:100%!important}.outside{padding:0!important}.pad{padding-left:24px!important;padding-right:24px!important}.headline{font-size:32px!important}.date{font-size:40px!important}.wordmark{width:290px!important;max-width:100%!important}.calendar{width:100%!important}}</style></head>
<body style="margin:0;padding:0;background:#1f1618;color:#1f1618;font-family:'EB Garamond',Garamond,Georgia,serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${preheader}</div>
<table role="presentation" width="100%" bgcolor="#1f1618"><tr><td align="center" class="outside" style="padding:24px 0;">
<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<table role="presentation" width="600" class="shell" bgcolor="#e8e0d2" style="width:100%;max-width:600px;">
<tr><td class="pad" align="center" bgcolor="#6b9a92" style="padding:30px 40px 26px;border-bottom:1px solid #a68b5b;"><a href="${WEBSITE}" style="text-decoration:none;"><img class="wordmark" src="${WEBSITE}VIP/assets/email-wordmark.png" width="340" alt="The Drillmaster" style="display:block;width:340px;max-width:100%;height:auto;color:#1f1618;font-size:32px;"></a><p style="margin:16px 0 0;font-size:19px;line-height:25px;font-style:italic;font-weight:700;color:#1f1618;">The mostly true story of<br>America’s <span style="font-style:normal;">GAYEST</span> founding daddy.</p></td></tr>
<tr><td class="pad" align="center" style="padding:30px 44px 26px;"><h1 class="headline" style="margin:0 0 18px;font-family:Fraunces,'Palatino Linotype',Palatino,Georgia,serif;font-size:36px;line-height:1.16;font-weight:700;color:#1f1618;">You’re on the<br>Creator's list.</h1><p style="margin:0;font-size:19px;line-height:28px;overflow-wrap:anywhere;">${name}, your <strong>${tickets}</strong> are reserved.<br>They’ll be waiting <strong>at the door, at no charge,</strong> under your name.</p></td></tr>
<tr><td class="pad" style="padding:0 44px;"><table role="presentation" width="100%" style="border-top:1px solid #a68b5b;border-bottom:1px solid #a68b5b;"><tr><td align="center" style="padding:24px 0;"><p style="margin:0 0 10px;font-size:18px;line-height:24px;font-style:italic;color:#4a353c;">Developmental preview</p><h2 class="date" style="margin:0 0 5px;font-family:Fraunces,'Palatino Linotype',Palatino,Georgia,serif;font-size:46px;line-height:1.1;font-weight:700;color:#1f1618;">October 13</h2><p style="margin:0 0 16px;font-size:17px;line-height:24px;color:#4a353c;">Tuesday · 2026</p><p style="margin:0 0 6px;font-size:23px;line-height:30px;font-weight:700;">7:30 PM · The Elysian</p><p style="margin:0 0 14px;font-size:17px;line-height:24px;">Doors at 7:00 PM · Pacific time</p><p style="margin:0;font-size:17px;line-height:24px;color:#4a353c;">1944 Riverside Drive<br>Los Angeles, CA 90039</p></td></tr></table></td></tr>
<tr><td class="pad" align="center" style="padding:26px 44px 30px;"><table role="presentation" class="calendar" width="280" style="width:280px;"><tr><td bgcolor="#c45f56" align="center" style="border-radius:6px;"><a href="${escapeHtml(googleCalendar)}" style="display:block;padding:16px 24px;color:#f7f4ef;font-family:Fraunces,'Palatino Linotype',Palatino,Georgia,serif;font-size:20px;font-weight:700;line-height:24px;text-decoration:none;mso-padding-alt:16px 24px;">Add to calendar</a></td></tr></table><p style="margin:12px 0 0;font-size:15px;line-height:23px;color:#4a353c;">Google Calendar above<br><a href="${ICS_URL}" style="color:#1f1618;text-decoration:underline;">Apple / Outlook calendar file</a></p></td></tr>
<tr><td><a href="${WEBSITE}" style="text-decoration:none;"><img src="${WEBSITE}VIP/assets/elysian-announcement.png" width="600" alt="The Drillmaster. A developmental preview at The Elysian, October 13 at 7:30 PM, with the ensemble cast." style="display:block;width:100%;max-width:600px;height:auto;"></a></td></tr>
<tr><td class="pad" align="center" style="padding:26px 44px 30px;"><p style="margin:0 0 20px;font-size:18px;line-height:28px;"><a href="${WEBSITE}" style="color:#1f1618;text-decoration:underline;">The Drillmaster website</a><br><a href="${LISTING}" style="color:#1f1618;text-decoration:underline;">The Elysian show listing</a></p><p style="margin:0 0 24px;font-size:16px;line-height:24px;color:#4a353c;">Your Creator's list tickets are already reserved.<br>No purchase is needed on The Elysian’s website.</p><p style="margin:0;font-size:19px;line-height:28px;font-style:italic;">See you at The Elysian,<br><strong>Jenny Zigrino, Caleb Zeringue<br>and Jeffrey Jay</strong></p></td></tr>
<tr><td class="pad" align="center" bgcolor="#1f1618" style="padding:26px 32px;color:#e8e0d2;border-top:1px solid #a68b5b;"><p style="margin:0 0 8px;font-size:16px;line-height:24px;">Changes or more tickets? Just reply.<br><a href="mailto:${CONTACT}" style="color:#8eb8b0;text-decoration:underline;">${CONTACT}</a></p><p style="margin:18px 0 0;font-size:13px;line-height:20px;color:#b8ad9c;">Sent because you joined the Creator's list.</p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
  const textContent = `YOU’RE ON THE CREATOR'S LIST\n\n${guest.name}, your ${tickets} are reserved. They’ll be waiting at the door, at no charge, under your name.\n\nTHE DRILLMASTER\nThe mostly true story of America’s Gayest Founding Daddy.\nDevelopmental preview\nTuesday, October 13, 2026\nShow: 7:30 PM. Doors: 7:00 PM (Pacific time).\nThe Elysian\n1944 Riverside Drive, Los Angeles, CA 90039\n\nYour ${tickets} will be available at no charge at the door. Give the door team the name ${guest.name} and say you’re on the Creator's list. There’s nothing to purchase online.\n\nAdd to calendar: ${googleCalendar}\nApple / Outlook calendar file: ${ICS_URL}\n\nPoster: ${WEBSITE}VIP/assets/elysian-announcement.png\nWebsite: ${WEBSITE}\nView the show at The Elysian: ${LISTING}\nThe Elysian page shows public ticket sales. Your Creator's list tickets are already arranged at no charge.\n\nSee you at The Elysian,\nJenny Zigrino, Caleb Zeringue and Jeffrey Jay\n\nQuestions, changes or more tickets: ${CONTACT}\nRSVP reference: ${guest.id}`;
  return { sender: { name: 'The Drillmaster', email: CONTACT }, replyTo: { name: 'The Drillmaster team', email: CONTACT }, to: [{ email: guest.email, name: guest.name }], subject, htmlContent, textContent,
    attachment: [{ content: Buffer.from(calendar).toString('base64'), name: 'The-Drillmaster-October-13.ics' }],
    headers: { idempotencyKey: guest.id }, tags: ['drillmaster-creators-confirmation', guest.id],
  };
}

async function sheetAction(input, options) {
  const response = await saveToGoogleSheet(input, options);
  const data = await response.json();
  if (!response.ok || data.ok !== true || typeof data.status !== 'string') {
    console.error('VIP confirmation record unavailable', { action: input.action, reference: input.id, httpStatus: response.status, ok: data.ok, status: data.status, error: typeof data.error === 'string' ? data.error : undefined });
    throw new Error('Email delivery record unavailable.');
  }
  return data;
}

export async function sendVipConfirmation(reference, options) {
  const { env, fetchImpl = fetch } = options;
  if (!env.BREVO_API_KEY || !env.VIP_RSVP_SHEETS_URL) return 'failed';
  const claimId = randomUUID();
  let claim;
  try {
    claim = await sheetAction({ action: 'claim-email', id: reference, claimId }, options);
    if (claim.status === 'sent') return 'sent';
    if (claim.status !== 'claimed') return claim.status === 'pending' ? 'pending' : 'failed';
  } catch { console.error('VIP confirmation claim failed', { reference }); return 'failed'; }
  // Use only the saved row's recipient, never editable retry details from the browser.
  const parsed = rsvpSchema.safeParse({ id: claim.reference, name: claim.name, email: claim.email, guests: claim.guests });
  if (!parsed.success || parsed.data.id !== reference) return 'failed';
  const body = JSON.stringify(buildConfirmationEmail(parsed.data));
  let status = 'uncertain', messageId = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
        body, redirect: 'error', signal: AbortSignal.timeout(12000),
      });
      const result = await response.json();
      if (response.ok && typeof result.messageId === 'string') { status = 'sent'; messageId = result.messageId; break; }
      if (result.code === 'duplicate_parameter' && /idempoten/i.test(result.message ?? '')) { status = 'sent'; messageId = 'provider-deduplicated'; break; }
      if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) { status = 'failed'; break; }
    } catch { /* Retry the exact provider key once; an uncertain send stays uncertain. */ }
  }
  try {
    await sheetAction({ action: 'finish-email', id: reference, claimId, status, messageId }, options);
  } catch { /* The durable claim remains, preventing a later duplicate outside the provider window. */ }
  return status === 'sent' ? 'sent' : status === 'failed' ? 'failed' : 'pending';
}
