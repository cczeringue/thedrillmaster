# Los Angeles event search implementation plan

**Goal:** Improve search discovery for comedy, theater and LGBTQ events in Los Angeles without changing visible website copy or styling.

**Architecture:** Retain the existing static Vite pages, canonical domain and Vercel deployment. Change only head metadata, structured data, sitemap dates and exact duplicate-URL redirects. Keep VIP noindex protections and approved social-preview wording.

**Tech stack:** HTML, JSON-LD, XML sitemap, Vercel routing, Node tests.

1. Audit live Google Search Console indexing and required Event markup. Both the homepage and dated event page are indexed; event markup is valid. Keep this structure.
2. Add a regression check for the duplicate event URL routes and public/private indexing contract. Capture original HTML bodies to verify they remain byte-identical.
3. Improve search titles and meta descriptions, classifying the dated performance as comedy and theater. Describe the LGBTQ history theme without renaming the comedy. Add event WebPage/Breadcrumb metadata and connect the performed creative work to its creators.
4. Remove the stale structured ticket price rather than promise an outdated amount; preserve the ticket offer URL. The event FAQ also has an outdated price but is visible copy, so leave it unchanged and flag it to Caleb.
5. Redirect only the two duplicate event paths to the existing trailing-slash canonical. Update only changed sitemap dates. Preserve all VIP rules.
6. Run focused regression checks and the required build; verify body preservation against the starting commit. Publish, verify live routes and JSON-LD, then request Google recrawls. Report actual indexing/request states without ranking guarantees.

No keyword stuffing, hidden body text, doorway pages, fabricated ratings, or unsupported local-business listing.
