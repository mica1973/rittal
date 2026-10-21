import { createOptimizedPicture } from '../../scripts/aem.js';

const LABELS = {
  region: 'Teaser-Karussell',
  item: 'Teaser',
  controls: 'Teaser-Steuerung',
  prev: 'Vorherige Teaser',
  next: 'Nächste Teaser',
  show: (n, total) => `Teaser ${n} von ${total} anzeigen`,
  of: (n, total) => `${n} von ${total}`,
};

let instanceCount = 0;

/**
 * Builds one teaser card from an authored row (image cell + body cell).
 * Tolerates a single mixed cell, missing image or extra cells.
 * @param {Element} row
 * @returns {HTMLLIElement}
 */
function buildItem(row) {
  const item = document.createElement('li');
  item.className = 'carousel-teaser-item';

  const media = document.createElement('div');
  media.className = 'carousel-teaser-item-image';
  const body = document.createElement('div');
  body.className = 'carousel-teaser-item-body';

  const picture = row.querySelector('picture');
  if (picture) {
    // keep an authored link around the image if present
    const link = picture.closest('a');
    const holder = link || picture;
    const wrapper = holder.closest('p');
    media.append(holder);
    if (wrapper && !wrapper.textContent.trim() && !wrapper.querySelector('picture, img')) wrapper.remove();
  }

  [...row.children].forEach((cell) => {
    [...cell.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return;
      body.append(node);
    });
  });

  if (media.children.length) item.append(media);
  else item.classList.add('no-image');
  if (body.children.length) item.append(body);

  item.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
  });

  return item;
}

export default function decorate(block) {
  instanceCount += 1;
  const id = `carousel-teaser-${instanceCount}`;

  const rows = [...block.children].filter((row) => row.textContent.trim() || row.querySelector('picture'));
  const total = rows.length;

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', LABELS.region);
  if (!block.hasAttribute('aria-label')) block.setAttribute('aria-label', LABELS.region);

  const track = document.createElement('ul');
  track.className = 'carousel-teaser-track';
  track.id = `${id}-track`;
  track.tabIndex = 0;
  // focusable scroll container needs an accessible name
  track.setAttribute('aria-label', LABELS.region);

  const items = rows.map((row, i) => {
    const item = buildItem(row);
    item.id = `${id}-item-${i + 1}`;
    item.setAttribute('role', 'group');
    item.setAttribute('aria-roledescription', LABELS.item);
    item.setAttribute('aria-label', LABELS.of(i + 1, total));
    track.append(item);
    return item;
  });

  block.replaceChildren(track);
  if (total < 2) return;

  const controls = document.createElement('div');
  controls.className = 'carousel-teaser-controls';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'carousel-teaser-prev';
  prev.setAttribute('aria-label', LABELS.prev);
  prev.setAttribute('aria-controls', track.id);

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'carousel-teaser-next';
  next.setAttribute('aria-label', LABELS.next);
  next.setAttribute('aria-controls', track.id);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', LABELS.controls);
  const indicators = document.createElement('ol');
  indicators.className = 'carousel-teaser-indicators';
  nav.append(indicators);

  const scrollToItem = (index) => {
    const target = items[Math.max(0, Math.min(index, items.length - 1))];
    track.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
  };

  const currentIndex = () => {
    const { scrollLeft } = track;
    let best = 0;
    let bestDist = Infinity;
    items.forEach((item, i) => {
      const dist = Math.abs(item.offsetLeft - scrollLeft);
      if (dist < bestDist) { best = i; bestDist = dist; }
    });
    return best;
  };

  items.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'carousel-teaser-indicator';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', LABELS.show(i + 1, total));
    btn.setAttribute('aria-controls', item.id);
    btn.addEventListener('click', () => scrollToItem(i));
    li.append(btn);
    indicators.append(li);
  });

  const update = () => {
    const index = currentIndex();
    const atStart = track.scrollLeft <= 1;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    prev.disabled = atStart;
    next.disabled = atEnd;
    indicators.querySelectorAll('button').forEach((btn, i) => {
      if (i === index) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
    controls.hidden = atStart && atEnd;
  };

  prev.addEventListener('click', () => scrollToItem(currentIndex() - 1));
  next.addEventListener('click', () => scrollToItem(currentIndex() + 1));

  track.addEventListener('keydown', (e) => {
    if (e.target !== track) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollToItem(currentIndex() - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollToItem(currentIndex() + 1);
    }
  });

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }, { passive: true });
  window.addEventListener('resize', update, { passive: true });

  controls.append(prev, nav, next);
  block.append(controls);
  update();
}
