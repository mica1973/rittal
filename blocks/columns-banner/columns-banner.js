import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Banner columns: one row, image column + text/CTA column.
 * Extra rows or cells are tolerated; image-only cells get a frame wrapper
 * that the design pass can turn into the decorative monitor.
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children].filter((row) => row.textContent.trim() || row.querySelector('picture'));
  const maxCols = rows.reduce((max, row) => Math.max(max, row.children.length), 0);
  block.classList.add(`columns-banner-${maxCols || 1}-cols`);

  rows.forEach((row) => {
    row.classList.add('columns-banner-row');
    [...row.children].forEach((col) => {
      const pictures = col.querySelectorAll('picture');
      const imageOnly = pictures.length > 0 && !col.textContent.trim();

      pictures.forEach((pic) => {
        const img = pic.querySelector('img');
        if (img) pic.replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '900' }]));
      });

      if (imageOnly) {
        col.classList.add('columns-banner-img-col');
        const frame = document.createElement('div');
        frame.className = 'columns-banner-frame';
        frame.append(...col.childNodes);
        col.replaceChildren(frame);
      } else if (col.textContent.trim() || col.children.length) {
        col.classList.add('columns-banner-text-col');
      } else {
        col.remove();
      }
    });
  });

  [...block.children].forEach((row) => {
    if (!rows.includes(row)) row.remove();
  });
}
