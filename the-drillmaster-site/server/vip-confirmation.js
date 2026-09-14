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
<style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0;mso-table-rspace:0}table{border-collapse:collapse}img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none}a{color:#174c78} @media(max-width:620px){.shell{width:100%!important}.pad{padding-left:24px!important;padding-right:24px!important}.headline{font-size:29px!important}.calendar{display:block!important;text-align:center!important}.brand{font-size:24px!important}}</style></head>
<body style="margin:0;padding:0;background:#ece9e3;color:#27171c;font-family:Roboto,Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${preheader}</div>
<table role="presentation" width="100%" bgcolor="#ece9e3"><tr><td align="center" style="padding:24px 0;">
<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<table role="presentation" width="600" class="shell" bgcolor="#fffdf7" style="width:100%;max-width:600px;">
<tr><td class="pad" bgcolor="#174c78" style="padding:27px 36px 25px;border-bottom:6px solid #f1be2b;color:#ffffff;"><a href="${WEBSITE}" class="brand" style="color:#ffffff;font-size:29px;font-weight:700;text-decoration:none;letter-spacing:1px;">THE DRILLMASTER</a><p style="font-size:13px;line-height:20px;margin:7px 0 0;color:#ffffff;">America’s Gayest Founding Daddy</p></td></tr>
<tr><td class="pad" style="padding:32px 36px 24px;"><p style="margin:0 0 12px;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.6px;color:#174c78;">YOUR INVITATION IS CONFIRMED</p><h1 class="headline" style="margin:0 0 18px;font-size:34px;line-height:1.14;font-weight:700;">You’re on the<br>Creator's list.</h1><p style="margin:0;font-size:17px;line-height:26px;overflow-wrap:anywhere;">${name}, we’ve added your name for <strong>${tickets}</strong>. Jenny Zigrino, Caleb Zeringue, and Jeffrey Jay can’t wait to welcome you.</p></td></tr>
<tr><td class="pad" style="padding:0 36px 26px;"><table role="presentation" width="100%" bgcolor="#f3efe5" style="border-left:4px solid #f1be2b;"><tr><td style="padding:22px 24px;"><p style="margin:0 0 6px;font-size:12px;line-height:18px;color:#174c78;font-weight:700;letter-spacing:1px;">Developmental preview</p><h2 style="margin:0 0 16px;font-size:24px;line-height:30px;">The Drillmaster</h2><p style="margin:0 0 16px;font-size:17px;line-height:26px;"><strong>Tuesday, October 13, 2026</strong><br><strong>7:30 PM</strong> · Doors open at 7:00 PM<br><span style="font-size:14px;color:#61575b;">Los Angeles / Pacific time</span></p><p style="margin:0;font-size:16px;line-height:25px;"><strong>The Elysian</strong><br>1944 Riverside Drive<br>Los Angeles, CA 90039</p></td></tr></table></td></tr>
<tr><td class="pad" style="padding:0 36px 26px;"><h2 style="margin:0 0 8px;font-size:19px;line-height:26px;">Your tickets are on us.</h2><p style="margin:0;font-size:16px;line-height:25px;">Your <strong>${tickets} will be available at no charge at the door.</strong> Give the door team the name <strong>${name}</strong> and let them know you’re on the Creator's list. There’s nothing to purchase online.</p></td></tr>
<tr><td class="pad" style="padding:0 36px 30px;"><table role="presentation" style="width:100%;"><tr><td bgcolor="#f1be2b" align="center" style="border:2px solid #27171c;"><a class="calendar" href="${escapeHtml(googleCalendar)}" style="display:block;padding:16px 24px;color:#27171c;font-size:17px;font-weight:700;line-height:22px;text-decoration:none;mso-padding-alt:16px 24px;">Add to calendar</a></td></tr></table><p style="margin:12px 0 0;text-align:center;font-size:13px;line-height:22px;color:#61575b;">Opens Google Calendar · <a href="${ICS_URL}" style="color:#174c78;text-decoration:underline;">Apple / Outlook calendar file</a></p></td></tr>
<tr><td><a href="${WEBSITE}" style="text-decoration:none;"><img src="${WEBSITE}VIP/assets/elysian-announcement.png" width="600" alt="The Drillmaster. A developmental preview at The Elysian, October 13 at 7:30 PM, with the ensemble cast." style="display:block;width:100%;max-width:600px;height:auto;"></a></td></tr>
<tr><td class="pad" style="padding:26px 36px 30px;"><p style="margin:0 0 16px;font-size:16px;line-height:25px;">A developmental preview of the mostly true story of America’s Gayest Founding Daddy. Thanks for being part of this next chapter.</p><table role="presentation" width="100%"><tr><td style="padding:0 0 14px;"><a href="${WEBSITE}" style="font-size:16px;font-weight:700;line-height:24px;color:#174c78;text-decoration:underline;">Explore The Drillmaster</a></td></tr><tr><td><a href="${LISTING}" style="font-size:16px;font-weight:700;line-height:24px;color:#174c78;text-decoration:underline;">View the show at The Elysian</a></td></tr></table><p style="margin:10px 0 25px;font-size:13px;line-height:20px;color:#61575b;">The Elysian page shows public ticket sales. Your Creator's list tickets are already arranged at no charge.</p><p style="margin:0;font-size:16px;line-height:25px;">See you at The Elysian,<br><strong>Jenny Zigrino, Caleb Zeringue<br>and Jeffrey Jay</strong></p></td></tr>
<tr><td class="pad" bgcolor="#174c78" style="padding:24px 36px;color:#ffffff;"><p style="margin:0 0 8px;font-size:14px;line-height:22px;">Need to change your plans or request more tickets?<br>Reply to this email or write to<br><a href="mailto:${CONTACT}" style="color:#ffffff;text-decoration:underline;">${CONTACT}</a>.</p><p style="margin:18px 0 0;font-size:11px;line-height:18px;color:#e0e8ef;overflow-wrap:anywhere;">Sent because you joined the Creator's list.<br>RSVP reference: ${escapeHtml(guest.id)}</p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
  const textContent = `YOU’RE ON THE CREATOR'S LIST\n\n${guest.name}, we’ve added your name for ${tickets}.\nJenny Zigrino, Caleb Zeringue, and Jeffrey Jay can’t wait to welcome you.\n\nTHE DRILLMASTER\nAmerica’s Gayest Founding Daddy\nDevelopmental preview\nTuesday, October 13, 2026\nShow: 7:30 PM. Doors: 7:00 PM (Pacific time).\nThe Elysian\n1944 Riverside Drive, Los Angeles, CA 90039\n\nYour ${tickets} will be available at no charge at the door. Give the door team the name ${guest.name} and say you’re on the Creator's list. There’s nothing to purchase online.\n\nAdd to calendar: ${googleCalendar}\nApple / Outlook calendar file: ${ICS_URL}\n\nPoster: ${WEBSITE}VIP/assets/elysian-announcement.png\nWebsite: ${WEBSITE}\nView the show at The Elysian: ${LISTING}\nThe Elysian page shows public ticket sales. Your Creator's list tickets are already arranged at no charge.\n\nSee you at The Elysian,\nJenny Zigrino, Caleb Zeringue and Jeffrey Jay\n\nQuestions, changes or more tickets: ${CONTACT}\nRSVP reference: ${guest.id}`;
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
