# VIP invitation

The invitation lives at `/VIP`. Lowercase `/vip` also works, with or without a trailing slash. It is a separate Vite page and does not add a link to the public navigation. Both the HTML metadata and Vercel response headers specify `noindex, nofollow, noarchive`. This is an unlisted invitation, not password protection.

## Source and design

The chat was imported from `https://drillmaster-vip-chat.cbiscuit.chatgpt.site`. The original chat components, square blue/gold bubbles, Baron portrait, local Roboto 400/700 fonts, event details, accessibility behavior, and calendar download are preserved. Frontend code is in `the-drillmaster-site/VIP`; static assets are in `the-drillmaster-site/public/VIP/assets`.

## Message playback

The invitation includes the supplied Elysian announcement poster, with an eight-second pause before the next message. Scrolling manually by wheel, touch, or keyboard stops automatic message scrolling for that page load; the remaining messages and form still arrive. The scripted messages use one delivery queue and arrive separately, with the classic Grindr notification audio for each new message when sound is enabled. Browsers that block autoplay show “Tap for sound.” The sound control can also mute playback.

The RSVP form is the final message and appears automatically after the scripted exchange. It invites guests to add their names to the Creator's list for one or two tickets available at no charge at the door, and includes the developmental-preview format, date, show and door times, venue, and address. Jenny Zigrino, Caleb Zeringue, and Jeffrey Jay are named as the inviters. The fixed event bar identifies the story as America’s Gayest Founding Daddy and the event as a developmental preview. The header says “Personal invitation” without an online status indicator. There is no message composer, suggested reply, chat menu, or interactive topic handler. The form cannot be dismissed; sound remains independently controllable.

Conversation state, form state, and the displayed receipt reset on each page load. Saved RSVP records remain on the server. No guest receipt is restored from browser storage.

## RSVP storage

The invite list is the private Google Sheet [The Drillmaster - VIP Invite List - October 13, 2026](https://docs.google.com/spreadsheets/d/1GcwjfXeuGiZPxxuWmw8xuKBf6QO2zgYG6a8ZkSNkPKo/edit), in the ChatGPT folder. The `RSVPs` tab has Name, Email, Tickets needed, Received at, and RSVP reference columns.

`POST /api/vip-rsvp` validates name, email, ticket count (1 or 2), and UUID. When `VIP_RSVP_SHEETS_URL` is configured, Google Sheets is the authoritative destination. The browser receives a success receipt only after the sheet writer confirms the save. A failed sheet write never silently falls back to another database. Before the Sheets connection is configured, the existing Sites backend remains available through `VIP_RSVP_UPSTREAM_TOKEN`.

The Apps Script source is in `integrations/google-sheets/Code.gs`. Its deployment copy uses the SHA-256 digest of a randomly generated token. The plaintext token is stored only in Vercel's sensitive `VIP_RSVP_SHEETS_TOKEN` environment variable and sent server-to-server. Set `VIP_RSVP_SHEETS_URL` to the deployed Apps Script `/exec` URL. Never use a `VITE_` prefix for secrets or commit them.

The writer opens only the fixed RSVP sheet, validates fields and ticket limits, escapes spreadsheet formula prefixes, and uses a script lock plus the RSVP UUID to avoid duplicate rows on retries. Its GET endpoint cannot list RSVPs. The sheet itself remains private. Apps Script's web app runs as the owner so guests do not need Google accounts; the application token protects the write endpoint.

The server retries an unverified Google response once using the same UUID. This covers a connection interruption after a successful write without creating a duplicate RSVP.

Requests for more than two tickets link to `thedrillmasterplay@gmail.com`. Successful signups show that the guest's name is on the list and tickets will be available at no charge at the door.

The original Sites database retains an explicitly labeled QA record with reference `98fff494-9e21-4a7a-91e8-cf954cb14527`. It is not an attendee and should not be imported into the invite list.

## Development and deployment

Use the existing Vercel project and GitHub deployment flow. Both root and nested Vercel configurations include the `/VIP` rewrite and search exclusion headers, matching the repository's existing two-root setup.

From `the-drillmaster-site`, run `npm ci`, `npm run build`, `npm run typecheck:vip`, and `npm run test:vip`. For local RSVP testing, provide the server-only connection variables in an ignored `.env.local` or the process environment, then run `npm run dev`. Do not add VIP to navigation, structured data, or a sitemap.

## Confirmation email

After a verified Sheet save, Vercel sends a personal confirmation through the existing active Brevo sender, `thedrillmasterplay@gmail.com`. It includes the saved name and one/two-ticket count, free ticket pickup at the door, event/door times and address, the supplied poster, website and Elysian event links, a Google Calendar button, and an attached/downloadable Apple/Outlook `.ics` file. Both HTML and plain-text bodies are supplied. The Elysian link is labeled as the public show listing, so its paid tickets do not confuse Creator's list guests. Replies reach the production team. This does not subscribe attendees to marketing or schedule reminder campaigns.

`server/vip-confirmation.js` owns the template and delivery. It uses the existing server-only `BREVO_API_KEY`. The authenticated Apps Script `claim-email` action reads recipient details from the saved row and stores a delivery claim in Script Properties, leaving the five guest-list columns unchanged. `finish-email` records provider acceptance or failure. Each email uses the RSVP UUID as Brevo's idempotency key, with one bounded retry. Sent receipts never resend. Concurrent claims wait; old uncertain sends outside the provider's deduplication window require review rather than risking duplicate mail.

Email failure does not undo a confirmed RSVP. The website reports whether the provider accepted the email and offers the saved event details and team contact if delivery is unconfirmed. Provider acceptance is not a guarantee of inbox placement. No email status, recipient address, or provider secret is exposed beyond the minimal receipt/status returned to that guest. API requests cannot directly invoke the private email actions.

To diagnose delivery, search Brevo transactional logs by the RSVP reference tag. The Apps Script property `confirmation:<reference>` stores the delivery state and provider message ID. `sent` means provider accepted, `failed` means rejected, and `uncertain` means the response could not be confirmed. The Google Sheet remains the authority for door tickets.
