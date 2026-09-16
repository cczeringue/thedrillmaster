# VIP Details and Cast panels

User-approved change: open Details and Cast in slide-up panels without skipping the invitation.

## Behavior

- Opening either panel pauses the message queue, preserving the current message's remaining delay.
- Closing with the close button, Back to chat, Escape, or the backdrop restores the originating toolbar button and reading position, then resumes playback.
- RSVP in the panel closes the dialog first, silently reveals the remaining invitation, and focuses the single RSVP form.
- The form stays mounted while browsing panels, so typed details survive.
- Verified RSVP receipts update immediately, independently of narrative playback.
- Existing timing, poster pause, sound control, floating Skip to RSVP, and server storage remain intact.

## Presentation and accessibility

Charcoal panels, yellow accents, Roboto, and a fixed action footer match the invitation. Panels align with the 640px chat on desktop and fill the width on phones. The body scrolls independently; close and RSVP controls remain visible. Radix Dialog provides modal focus management and Escape/backdrop dismissal. Motion respects the existing reduced-motion rule; the footer respects the safe-area inset.

## Validation

- Five new deterministic queue tests cover remaining delays, repeated pause/resume, additions while paused, silent flush, and cleanup on unload.
- The full build runs all 39 regression tests and TypeScript checks.
- Browser checks cover 320px, 390px, and 1280px widths; focus trapping and restoration; normal playback resumption; repeated panel visits; direct panel-to-RSVP navigation; preserved draft fields; and a delayed simulated RSVP response while a panel is open.
- The delayed-response fixture runs only on localhost and does not write a Sheet row or send an email.

## Website drawer

The title in the event bar opens the full main website in the same drawer system. It uses a same-origin iframe, wider on desktop and full-width on phones, with the chat paused and Back to chat / RSVP controls always available. The title now uses a drawer chevron instead of an external-link icon.

An iframe load is accepted only when the expected site navigation is present. Failed loads offer retry and an optional external link; a slow load gets help after 12 seconds. Frame listeners are cleaned up on navigation and unmount. Escape closes an embedded bio dialog first, then the website drawer on a subsequent press.

Verified at 320px, 390px, and 1280px: embedded homepage rendering, paused chat, nested bio Escape behavior, focus return, direct RSVP navigation, and a simulated failed homepage load followed by successful retry. All 39 regression tests and the production build passed.
