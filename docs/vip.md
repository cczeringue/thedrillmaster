# VIP invitation

The invitation lives at `/VIP`. It is a separate Vite page and does not add a link to the public navigation. Both the HTML metadata and Vercel response headers specify `noindex, nofollow, noarchive`. This is an unlisted invitation, not password protection.

## Source and design

The chat was imported from `https://drillmaster-vip-chat.cbiscuit.chatgpt.site`. The original chat components, square blue/gold bubbles, Baron portrait, local Roboto 400/700 fonts, event details, accessibility behavior, and calendar download are preserved. Frontend code is in `the-drillmaster-site/VIP`; static assets are in `the-drillmaster-site/public/VIP/assets`.

## RSVP storage

`POST /api/vip-rsvp` validates requests and submits them server-to-server to the original invitation's `/api/rsvp` endpoint. RSVPs stay in that site's existing D1 `DB.vip_rsvps` table. The browser receives only a verified receipt. Session storage remembers that receipt; it is not the RSVP database.

Set `VIP_RSVP_UPSTREAM_TOKEN` as a sensitive, server-only Vercel environment variable. Its value is the original site's existing Sites API bypass bearer token. Never prefix it with `VITE_`, embed it in frontend code, or commit it. If that token is rotated, update the Vercel variable and redeploy. The original Sites backend must remain deployed for RSVP submission to work.

The proxy accepts only name, email, party size (1 or 2), and a UUID. It cannot list RSVPs or forward arbitrary requests. The original database uses that UUID for idempotent retries. A missing credential, unavailable backend, or invalid receipt returns an error instead of confirming an unsaved request. An RSVP remains a request pending the production team's confirmation.

View saved requests in the original VIP Chat site's database, table `vip_rsvps`. The integration verification entry uses reference `98fff494-9e21-4a7a-91e8-cf954cb14527`, name `INTEGRATION TEST - not an attendee`, and a reserved `.invalid` email. Exclude this clearly labeled QA entry from attendance totals.

## Development and deployment

Use the existing Vercel project and GitHub deployment flow. Both root and nested Vercel configurations include the `/VIP` rewrite and search exclusion headers, matching the repository's existing two-root setup.

From `the-drillmaster-site`, run `npm ci`, `npm run build`, `npm run typecheck:vip`, and `npm run test:vip`. For local RSVP testing, provide the server-only variable in an ignored `.env.local` or the process environment, then run `npm run dev`. Do not add VIP to navigation, structured data, or a sitemap.
