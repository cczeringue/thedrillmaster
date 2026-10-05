# Website analytics

Google Analytics 4 was set up October 5, 2026, for https://www.thedrillmaster.gay.

- Account: CZeringue (69668506).
- Property: The Drillmaster (557500969). Reporting timezone: America/Los_Angeles. Currency: USD.
- Web stream: The Drillmaster website (16049044454).
- Public measurement ID: G-GXFTMNXLD1. This is not a secret.
- Main script: src/analytics.js, included on all five built HTML entry points.
- Ticket-interest event: get_tickets_click. button_location identifies the announcement, navigation, hero, event_details, cast, newsletter, footer, event_hero or event_footer button.
- Event-scoped custom dimension: Ticket button location, registered October 5 for parameter button_location. Reporting API name: customEvent:button_location. Include a button-location click breakdown once processed data is available.
- Count eventCount as clicks; totalUsers for this event as distinct ticket clickers. Click-through rate is distinct ticket clickers / total website users for the same period, not clicks / page views. Never call clicks ticket purchases.
- Enhanced measurement is off. No automatic form or search tracking. Advertising signals and ad personalization are disabled. Page URLs and referrers omit query strings and fragments. No RSVP form data is read.
- Tracking runs only on the two production hostnames, not localhost or Vercel previews. Ticket navigation is never intercepted and analytics errors cannot block it.

## Daily reporting

Codex heartbeat `daily-drillmaster-analytics` runs at 9 AM Pacific and reports in the originating chat. Read the previous complete Pacific calendar day and compare with the previous day only when both have collection coverage. Separate public website and /VIP traffic. GA4 can take 24-48 hours to finish processing; mark recent totals provisional and revise the prior day when needed. Missing collection or failed access is unavailable, not zero. Do not sum unique users across pages or days.

There was no tracking script before October 5 setup. Vercel had Web Analytics enabled, but its October 5 API query returned no rows. Historical visitor and click totals cannot be reconstructed from that absence.

The October 5 setup verification includes operator test traffic and a controlled ticket click. Exclude known test data where possible or disclose it. Never promise exact human counts: blockers, consent, cookie resets and cross-device use affect measurement. No ticket purchases are measured because checkout belongs to The Elysian/OpenDate.

## Live verification, October 5

- Production deployment: https://thedrillmaster-fi14cy3yr-calebs-projects-63729651.vercel.app, aliased to the public domain.
- Google Analytics Realtime visibly received one page_view and one get_tickets_click from the controlled production test. The ticket event's button_location value was hero.
- Realtime also displayed one first_visit, one session_start and one generic click. Only get_tickets_click is the ticket-interest metric; do not add generic click to it. Enhanced measurement was then disabled and its Turn off confirmation completed, retaining standard page views and the explicit custom ticket event.
- Evidence: /Users/caleb/Documents/Codex/2026-09-11/dr/drillmaster-analytics-verified.png.
- The production build passed 46 automated tests and type checking. Tests cover ticket-link behavior when tracking fails, production-only collection, nested button targets, middle clicks, and stripping query strings and fragments.
- The stream setup status still showed its initial no-data notice while Realtime already showed received events. Prefer the direct Realtime receipt as the collection evidence; processed daily reports may lag.
- Follow-up verification confirmed the test ticket link opened The Drillmaster's October 13, 7:30pm OpenDate checkout. No tickets were purchased. The custom dimension is visibly saved; evidence: /Users/caleb/Documents/Codex/2026-09-11/dr/drillmaster-button-reporting.png.
