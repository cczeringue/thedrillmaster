// Aggregate site and ticket-interest reporting. Never read guest form values.
(() => {
  try {
    if (!['www.thedrillmaster.gay', 'thedrillmaster.gay'].includes(window.location.hostname)) return;
    const measurementId = 'G-GXFTMNXLD1';
    const pageLocation = window.location.origin + window.location.pathname;
    let referrer = '';
    try { const url = new URL(document.referrer); referrer = url.origin + url.pathname; } catch {}
    window.dataLayer = window.dataLayer || [];
    const gtag = function () { window.dataLayer.push(arguments); };
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', measurementId, {
      page_location: pageLocation,
      page_referrer: referrer,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
    const recordTicketClick = (event) => {
      try {
        if (event.button !== undefined && event.button !== 0 && event.button !== 1) return;
        const anchor = event.target?.closest?.('a[href]');
        if (!anchor) return;
        const destination = new URL(anchor.href);
        if (destination.hostname !== 'app.opendate.io' || destination.pathname !== '/confirms/752818/web_orders/new') return;
        gtag('event', 'get_tickets_click', {
          button_location: anchor.dataset.ticketPlacement || 'other',
          page_location: pageLocation,
          transport_type: 'beacon',
        });
      } catch { /* Tracking must never interrupt the ticket link. */ }
    };
    document.addEventListener('click', recordTicketClick);
    document.addEventListener('auxclick', recordTicketClick);
  } catch { /* The site remains usable if analytics is blocked. */ }
})();
