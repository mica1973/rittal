import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Teaser cards: one row per card, image cell + body cell
 * (eyebrow paragraph, linked heading, text, CTA). Cells may be omitted,
 * merged into one, or extended; content is regrouped defensively.
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    if (!row.textContent.trim() && !row.querySelector('picture')) return;

    const li = document.createElement('li');
    li.className = 'cards-teaser-card';

    const media = document.createElement('div');
    media.className = 'cards-teaser-card-image';
    const body = document.createElement('div');
    body.className = 'cards-teaser-card-body';

    const picture = row.querySelector('picture');
    if (picture) {
      const holder = picture.closest('a') || picture;
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

    // mark a leading plain paragraph before the heading as eyebrow
    const first = body.firstElementChild;
    if (first && first.tagName === 'P' && !first.classList.contains('button-wrapper')
      && first.nextElementSibling && /^H[1-6]$/.test(first.nextElementSibling.tagName)) {
      first.classList.add('cards-teaser-eyebrow');
    }

    if (media.children.length) li.append(media);
    else li.classList.add('no-image');
    if (body.children.length) li.append(body);
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
  });

  block.replaceChildren(ul);
}
