# VIP invitation

The invitation lives at `/VIP`. Lowercase `/vip` also works, with or without a trailing slash. It is a separate Vite page and does not add a link to the public navigation. Both the HTML metadata and Vercel response headers specify `noindex, nofollow, noarchive`. This is an unlisted invitation, not password protection.

## Source and design

The chat was imported from `https://drillmaster-vip-chat.cbiscuit.chatgpt.site`. The original chat components, square blue/gold bubbles, Baron portrait, local Roboto 400/700 fonts, event details, accessibility behavior, and calendar download are preserved. Frontend code is in `the-drillmaster-site/VIP`; static assets are in `the-drillmaster-site/public/VIP/assets`.

## Message playback

The invitation includes the supplied Elysian announcement poster. Introductory and interactive messages use one delivery queue and arrive separately, with the classic Grindr notification audio for each new message when sound is enabled. Browsers that block autoplay show “Tap for sound.” The sound control can also mute playback.

Conversation state, form state, and the displayed receipt reset on each page load. Saved RSVP records remain on the server. No guest receipt is restored from browser storage.

## RSVP storage

The invite list is the private Google Sheet [The Drillmaster - VIP Invite List - October 13, 2026](https://docs.google.com/spreadsheets/d/1GcwjfXeuGiZPxxuWmw8xuKBf6QO2zgYG6a8ZkSNkPKo/edit), in the ChatGPT folder. The `RSVPs` tab has Name, Email, Tickets needed, Received at, and RSVP reference columns.

`POST /api/vip-rsvp` validates name, email, ticket count (1 or 2), and UUID. When `VIP_RSVP_SHEETS_URL` is configured, Google Sheets is the authoritative destination. The browser receives a success receipt only after the sheet writer confirms the save. A failed sheet write never silently falls back to another database. Before the Sheets connection is configured, the existing Sites backend remains available through `VIP_RSVP_UPSTREAM_TOKEN`.

The Apps Script source is in `integrations/google-sheets/Code.gs`. Its deployment copy uses the SHA-256 digest of a randomly generated token. The plaintext token is stored only in Vercel's sensitive `VIP_RSVP_SHEETS_TOKEN` environment variable and sent server-to-server. Set `VIP_RSVP_SHEETS_URL` to the deployed Apps Script `/exec` URL. Never use a `VITE_` prefix for secrets or commit them.

The writer opens only the fixed RSVP sheet, validates fields and ticket limits, escapes spreadsheet formula prefixes, and uses a script lock plus the RSVP UUID to avoid duplicate rows on retries. Its GET endpoint cannot list RSVPs. The sheet itself remains private. Apps Script's web app runs as the owner so guests do not need Google accounts; the application token protects the write endpoint.

Requests for more than two tickets link to `thedrillmasterplay@gmail.com`. An RSVP remains a request pending the production team's confirmation.

The original Sites database retains an explicitly labeled QA record with reference `98fff494-9e21-4a7a-91e8-cf954cb14527`. It is not an attendee and should not be imported into the invite list.

## Development and deployment

Use the existing Vercel project and GitHub deployment flow. Both root and nested Vercel configurations include the `/VIP` rewrite and search exclusion headers, matching the repository's existing two-root setup.

From `the-drillmaster-site`, run `npm ci`, `npm run build`, `npm run typecheck:vip`, and `npm run test:vip`. For local RSVP testing, provide the server-only connection variables in an ignored `.env.local` or the process environment, then run `npm run dev`. Do not add VIP to navigation, structured data, or a sitemap.
