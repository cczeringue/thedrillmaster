# Search discovery for The Drillmaster

## Goal and scope

Help relevant buyers find The Drillmaster for searches combining gay/queer comedy, Los Angeles/LA, The Elysian, cast names and the October 13 show. Broad single-word number-one rankings are not a deliverable or a guarantee.

Preserve the current visual identity, creator bios and private VIP/Creator's List behavior. Use the existing GitHub/Vercel hosting, per the user's original instruction.

## Changes

- Descriptive homepage title, social title and description, natural Los Angeles/gay-comedy wording, and a direct show-details link.
- One substantive event page at `/shows/the-elysian-october-13-2026/`, with poster, format, date, venue, full ticket price, cast, story and practical questions. It is a single-event destination, not a set of keyword doorway pages.
- TheaterEvent JSON-LD on that event URL only. It includes the date/time with Pacific offset, full address, current cast, organizer, public ticket URL and fee-inclusive price. Homepage WebSite/WebPage/PerformingGroup metadata identifies the brand and references the event.
- Public sitemap and robots.txt, self-referencing canonicals, and a permanent redirect from `/index.html` to `/`.
- Existing standalone Jenny and Caleb biography pages receive canonical/robots metadata. Visible bios remain unchanged.
- The supplied poster is re-encoded at 1200 x 1500 to WebP, without creative alterations, for a public event image (280 KB instead of the original 5.5 MB). Existing VIP poster and link-preview assets remain unchanged.
- Google Search Console verification uses the signed-in Caleb Zeringue account. The verification tag is intentionally public.

## Verified event facts

Read the official [Elysian event](https://www.elysiantheater.com/shows/thedrillmaster1013?v3=true) and its embedded public checkout on September 14, 2026. General admission is $35, fee $6.87, total $41.87. Quantity remained zero; no tickets were reserved or purchased. Availability was offered publicly. Scheduled show window: October 13, 2026, 7:30–8:45 p.m. Doors at 7 p.m.; general-admission seating from 7:15 p.m. Address: 1944 Riverside Dr, Los Angeles, CA 90039.

## Search guidance

- [Google Search Essentials](https://developers.google.com/search/docs/essentials): useful content, meaningful titles/headings and crawlable links.
- [Google event markup](https://developers.google.com/search/docs/appearance/structured-data/event): a unique single-event URL; public bookability; accurate visible facts; offer price includes fees. Markup does not guarantee a rich result or ranking.
- [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): canonical public URLs only; accurate modification dates; no invented priority/change-frequency values.
- [Recrawl requests](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl): request indexing after publishing; a request does not guarantee immediate indexing.

The VIP page intentionally remains crawlable so Google can see its existing noindex response. It is absent from the sitemap and public navigation. Do not add a robots disallow rule that prevents crawlers from reading noindex.

## Validation and maintenance

The production build passes. Parsed built HTML/JSON-LD verifies one H1 per page, canonical uniqueness, required event facts, fee-inclusive price matching visible copy, all eleven performer names, ticket URL, four sitemap entries, and VIP exclusion. Mobile and desktop previews load the poster, show ticket information, and expand the practical questions without page errors.

After October 13 or any venue change, update the event date/status, availability, price, visible copy and sitemap lastmod together. Keep this dated URL as a truthful event archive if future performances use a new event URL. No automatic monitoring or paid campaign was created.
