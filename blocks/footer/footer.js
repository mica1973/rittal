import { toClassName } from '../../scripts/aem.js';

const SECTION_NAMES = ['links', 'social', 'copyright'];

/**
 * Fetches the footer fragment as plain HTML. Local preview serves it under /content,
 * Document Authoring / Edge Delivery serve it from the site root.
 * @returns {Promise<string|null>}
 */
async function fetchFooter() {
  // metadata-independent: /content first (local preview), then the root (DA / Edge Delivery)
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  return resp.text();
}

/**
 * Groups each heading with the list that follows it into a link column.
 * Tolerates lists without a heading and headings without a list.
 * @param {Element} section link section
 */
function buildColumns(section) {
  const columns = [];
  let current = null;
  [...section.children].forEach((el) => {
    if (/^H[1-6]$/.test(el.tagName) || !current) {
      current = document.createElement('div');
      current.className = 'footer-column';
      columns.push(current);
    }
    current.append(el);
  });
  section.replaceChildren(...columns);
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const html = await fetchFooter();
  block.textContent = '';
  if (!html) return;

  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  const footer = document.createElement('div');
  footer.className = 'footer-inner';
  [...fragment.children].forEach((section, i) => {
    const name = SECTION_NAMES[i];
    if (name) section.classList.add(`footer-${name}`);
    footer.append(section);
  });

  const links = footer.querySelector('.footer-links');
  if (links) buildColumns(links);

  // social links are icon-only: keep the network name as accessible label and icon key
  footer.querySelectorAll('.footer-social a').forEach((a) => {
    const label = a.textContent.trim();
    a.setAttribute('aria-label', label);
    a.dataset.icon = toClassName(label);
  });

  block.append(footer);
}
