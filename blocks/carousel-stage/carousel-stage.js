import { createOptimizedPicture } from '../../scripts/aem.js';

const LABELS = {
  region: 'Karussell',
  slide: 'Folie',
  controls: 'Folien-Steuerung',
  prev: 'Vorherige Folie',
  next: 'Nächste Folie',
  show: (n, total) => `Folie ${n} von ${total} anzeigen`,
  of: (n, total) => `${n} von ${total}`,
  pause: 'Automatische Wiedergabe anhalten',
  play: 'Automatische Wiedergabe starten',
};

// matches the source stage slider (swiper autoplay delay)
const AUTOPLAY_DELAY = 5750;

let instanceCount = 0;

/**
 * Splits an authored row into an image cell and a content cell.
 * Tolerates rows with a single cell (picture + text mixed) or extra cells.
 * @param {Element} row
 * @returns {{ media: Element, content: Element }}
 */
function splitRow(row) {
  const cells = [...row.children];
  const media = document.createElement('div');
  media.className = 'carousel-stage-slide-image';
  const content = document.createElement('div');
  content.className = 'carousel-stage-slide-content';

  const picture = row.querySelector('picture');
  if (picture) {
    const wrapper = picture.closest('p') || picture;
    media.append(picture);
    if (wrapper !== picture && !wrapper.textContent.trim() && !wrapper.children.length) {
      wrapper.remove();
    }
  }

  cells.forEach((cell) => {
    [...cell.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return;
      content.append(node);
    });
  });

  return { media, content };
}

function optimizeImages(slide, eager) {
  slide.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, eager, [
      { media: '(min-width: 900px)', width: '2000' },
      { width: '900' },
    ]);
    img.closest('picture').replaceWith(optimized);
  });
}

function showSlide(block, index) {
  const slides = [...block.querySelectorAll('.carousel-stage-slide')];
  if (!slides.length) return;
  const total = slides.length;
  const target = ((index % total) + total) % total;
  block.dataset.activeSlide = target;

  slides.forEach((slide, i) => {
    const active = i === target;
    slide.classList.toggle('active', active);
    slide.setAttribute('aria-hidden', !active);
    if (active) slide.removeAttribute('inert');
    else slide.setAttribute('inert', '');
  });

  block.querySelectorAll('.carousel-stage-indicator button').forEach((btn, i) => {
    if (i === target) btn.setAttribute('aria-current', 'true');
    else btn.removeAttribute('aria-current');
  });
}

export default function decorate(block) {
  instanceCount += 1;
  const id = `carousel-stage-${instanceCount}`;
  block.id = block.id || id;

  const rows = [...block.children].filter((row) => row.textContent.trim() || row.querySelector('picture'));
  const total = rows.length;

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', LABELS.region);
  if (!block.hasAttribute('aria-label')) block.setAttribute('aria-label', LABELS.region);

  const viewport = document.createElement('div');
  viewport.className = 'carousel-stage-viewport';
  const track = document.createElement('ul');
  track.className = 'carousel-stage-slides';
  track.setAttribute('aria-live', 'polite');
  viewport.append(track);

  rows.forEach((row, i) => {
    const { media, content } = splitRow(row);
    const slide = document.createElement('li');
    slide.className = 'carousel-stage-slide';
    slide.id = `${id}-slide-${i + 1}`;
    slide.dataset.slideIndex = i;
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', LABELS.slide);
    slide.setAttribute('aria-label', LABELS.of(i + 1, total));
    if (media.children.length) slide.append(media);
    else slide.classList.add('no-image');
    if (content.children.length) slide.append(content);
    optimizeImages(slide, i === 0);
    track.append(slide);
  });

  block.replaceChildren(viewport);

  if (total > 1) {
    const controls = document.createElement('div');
    controls.className = 'carousel-stage-controls';

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'carousel-stage-prev';
    prev.setAttribute('aria-label', LABELS.prev);
    prev.setAttribute('aria-controls', `${id}-slides`);

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'carousel-stage-next';
    next.setAttribute('aria-label', LABELS.next);
    next.setAttribute('aria-controls', `${id}-slides`);

    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', LABELS.controls);
    const indicators = document.createElement('ol');
    indicators.className = 'carousel-stage-indicators';
    rows.forEach((_, i) => {
      const li = document.createElement('li');
      li.className = 'carousel-stage-indicator';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', LABELS.show(i + 1, total));
      btn.setAttribute('aria-controls', `${id}-slide-${i + 1}`);
      btn.addEventListener('click', () => showSlide(block, i));
      li.append(btn);
      indicators.append(li);
    });
    nav.append(indicators);

    track.id = `${id}-slides`;
    prev.addEventListener('click', () => showSlide(block, Number(block.dataset.activeSlide) - 1));
    next.addEventListener('click', () => showSlide(block, Number(block.dataset.activeSlide) + 1));

    // Autoplay with a visible pause/play toggle (WCAG 2.2.2). Rotation also pauses while the
    // pointer or keyboard focus is inside the block, and never starts under reduced motion.
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'carousel-stage-toggle';
    toggle.setAttribute('aria-controls', `${id}-slides`);

    let stoppedByUser = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let hovered = false;
    let focused = false;
    let timer = null;

    const sync = () => {
      const shouldRun = !stoppedByUser && !hovered && !focused && !document.hidden;
      if (shouldRun && !timer) {
        const advance = () => showSlide(block, Number(block.dataset.activeSlide) + 1);
        timer = setInterval(advance, AUTOPLAY_DELAY);
      } else if (!shouldRun && timer) {
        clearInterval(timer);
        timer = null;
      }
      // announce slide changes only while rotation is stopped
      track.setAttribute('aria-live', timer ? 'off' : 'polite');
      toggle.classList.toggle('paused', stoppedByUser);
      toggle.setAttribute('aria-label', stoppedByUser ? LABELS.play : LABELS.pause);
    };

    toggle.addEventListener('click', () => {
      stoppedByUser = !stoppedByUser;
      sync();
    });
    block.addEventListener('mouseenter', () => { hovered = true; sync(); });
    block.addEventListener('mouseleave', () => { hovered = false; sync(); });
    block.addEventListener('focusin', () => { focused = true; sync(); });
    block.addEventListener('focusout', (e) => {
      if (block.contains(e.relatedTarget)) return;
      focused = false;
      sync();
    });
    document.addEventListener('visibilitychange', sync);

    controls.append(prev, nav, next, toggle);
    block.append(controls);
    sync();

    block.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      const current = Number(block.dataset.activeSlide);
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showSlide(block, current - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        showSlide(block, current + 1);
      }
    });

    // basic swipe support
    let startX = null;
    viewport.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    viewport.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const delta = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(delta) < 40) return;
      const current = Number(block.dataset.activeSlide);
      showSlide(block, delta < 0 ? current + 1 : current - 1);
    }, { passive: true });
  }

  showSlide(block, 0);
}
