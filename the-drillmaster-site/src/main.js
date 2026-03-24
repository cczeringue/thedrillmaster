// --- Nav scroll effect (transparent → solid) ---

const siteNav = document.getElementById('site-nav');

if (siteNav) {
  const onScroll = () => {
    siteNav.classList.toggle('is-scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// --- Mobile nav toggle ---

const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const open = navToggle.classList.toggle('is-open');
    navLinks.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', open);
    // Force scrolled look when mobile menu is open (for contrast)
    if (siteNav) {
      if (open) siteNav.classList.add('is-scrolled');
      else if (window.scrollY <= 60) siteNav.classList.remove('is-scrolled');
    }
  });

  // Close menu when a nav link is clicked
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('is-open');
      navLinks.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// --- Bio modals ---

const bioModal = document.getElementById('bio-modal');
const bioBackdrop = bioModal?.querySelector('.bio-modal__backdrop');
const bioClose = bioModal?.querySelector('.bio-modal__close');
const bioContents = {
  jenny: document.getElementById('bio-content-jenny'),
  caleb: document.getElementById('bio-content-caleb'),
};

let lastFocusedBeforeModal = null;

function openBioModal(key) {
  const content = bioContents[key];
  if (!bioModal || !content) return;
  lastFocusedBeforeModal = document.activeElement;
  bioModal.removeAttribute('hidden');
  bioModal.setAttribute('aria-labelledby', 'bio-modal-title-' + key);
  Object.values(bioContents).forEach((el) => {
    if (el) {
      el.hidden = true;
      el.scrollTop = 0;
    }
  });
  content.hidden = false;
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = window.innerWidth - document.documentElement.clientWidth ? `${getScrollbarWidth()}px` : '0';
  requestAnimationFrame(() => bioClose?.focus());
}

function closeBioModal() {
  if (!bioModal) return;
  bioModal.setAttribute('hidden', '');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
    lastFocusedBeforeModal.focus();
  }
}

function getScrollbarWidth() {
  return window.innerWidth - document.documentElement.clientWidth;
}

bioModal?.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || bioModal.hasAttribute('hidden')) return;
  closeBioModal();
});

bioBackdrop?.addEventListener('click', closeBioModal);
bioClose?.addEventListener('click', closeBioModal);
bioModal?.querySelector('.bio-modal__close-btn')?.addEventListener('click', closeBioModal);

document.querySelectorAll('[data-bio]').forEach((el) => {
  el.addEventListener('click', () => {
    const key = el.getAttribute('data-bio');
    if (key && bioContents[key]) openBioModal(key);
  });
});

// --- Newsletter (Brevo via API, same pattern as luigithemusical.info) ---

const newsletterForm = document.getElementById('newsletter-form');
const newsletterSuccess = document.getElementById('newsletter-success');
const newsletterError = document.getElementById('newsletter-error');

if (newsletterForm) {
  newsletterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const field = newsletterForm.elements.email;
    const email = (field && field.value || '').trim();
    if (!email) return;

    newsletterError.hidden = true;
    newsletterError.textContent = '';
    const btn = newsletterForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        newsletterForm.hidden = true;
        newsletterSuccess.hidden = false;
      } else {
        newsletterError.textContent = data.error || 'Nein. This did not work. Check yourself and try again.';
        newsletterError.hidden = false;
      }
    } catch (err) {
      newsletterError.textContent = 'Nein. This did not work. Check yourself and try again.';
      newsletterError.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

// --- "fabulous" sparkle effect ---

const fab = document.querySelector('.fabulous');
const sparkleChars = ['✦', '✧', '⋆', '✶', '✷', '·'];

function spawnSparkle(el) {
  const s = document.createElement('span');
  s.className = 'sparkle';
  s.textContent = sparkleChars[Math.floor(Math.random() * sparkleChars.length)];

  const rect = el.getBoundingClientRect();
  const x = Math.random() * rect.width;
  const y = Math.random() * rect.height * 0.6 - rect.height * 0.3;
  const size = 8 + Math.random() * 10;

  s.style.left = x + 'px';
  s.style.top = y + 'px';
  s.style.fontSize = size + 'px';
  s.style.color = Math.random() > 0.5 ? '#c9a84c' : '#b8943e';

  el.appendChild(s);
  s.addEventListener('animationend', () => s.remove());
}

function burstSparkles(el, count) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => spawnSparkle(el), i * 60);
  }
}

// Sparkle on hover
fab.addEventListener('mouseenter', () => {
  fab.classList.add('is-sparkling');
  burstSparkles(fab, 6);
});

fab.addEventListener('mouseleave', () => {
  fab.classList.remove('is-sparkling');
});

// Occasional ambient sparkle
function ambientSparkle() {
  if (!document.hidden) {
    spawnSparkle(fab);
  }
  const next = 2500 + Math.random() * 5000;
  setTimeout(ambientSparkle, next);
}

setTimeout(ambientSparkle, 3000);
