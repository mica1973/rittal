import { toClassName } from '../../scripts/aem.js';

// the full two-row header layout applies from 1200px; below that the compact mobile header is used
const isDesktop = window.matchMedia('(min-width: 1200px)');

const SECTION_NAMES = ['brand', 'meta', 'tools', 'sections', 'search'];

/**
 * Fetches the nav fragment as plain HTML. Local preview serves it under /content,
 * Document Authoring / Edge Delivery serve it from the site root.
 * @returns {Promise<{html: string, base: string}|null>}
 */
async function fetchNav() {
  // metadata-independent: /content first (local preview), then the root (DA / Edge Delivery)
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  return { html: await resp.text(), base: resp.url };
}

/**
 * Resolves relative image paths in the fragment against the fragment location.
 * @param {Element} root fragment root
 * @param {string} base fragment URL
 */
function resolveImages(root, base) {
  root.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (!/^(https?:|data:|\/)/.test(src)) img.src = new URL(src, base).href;
    img.loading = 'eager';
  });
}

/**
 * Gives every list entry a key derived from its label, used for icons.
 * @param {Element} section nav section
 */
function addIconKeys(section) {
  section.querySelectorAll(':scope li').forEach((li) => {
    const label = li.textContent.trim();
    li.dataset.icon = li.querySelector('a') ? toClassName(label) : 'locale';
    // icon-only on small screens: keep the label for assistive technology
    const a = li.querySelector('a');
    if (a && !a.getAttribute('aria-label')) a.setAttribute('aria-label', label);
  });
}

/**
 * Builds a search form from an authored link: href = form action, text = placeholder.
 * @param {Element} section search section
 * @returns {Element}
 */
function buildSearch(section) {
  const link = section.querySelector('a[href]');
  if (!link) return section;
  const label = link.textContent.trim();

  const form = document.createElement('form');
  form.className = 'nav-search-form';
  form.action = link.href;
  form.method = 'get';
  form.setAttribute('role', 'search');

  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'q';
  input.placeholder = label;
  input.setAttribute('aria-label', label);
  input.autocomplete = 'off';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'nav-search-submit';
  submit.setAttribute('aria-label', 'Suchen');

  form.append(submit, input);

  // compact screens link to the search page instead of showing the field
  const mobileLink = document.createElement('a');
  mobileLink.className = 'nav-search-link';
  mobileLink.href = link.href;
  mobileLink.setAttribute('aria-label', label);

  section.replaceChildren(form, mobileLink);
  return section;
}

/**
 * Opens or closes the mobile menu.
 * @param {Element} nav nav element
 * @param {boolean} [force] desired state
 */
function toggleMenu(nav, force) {
  const button = nav.querySelector('.nav-hamburger button');
  const open = typeof force === 'boolean' ? force : nav.getAttribute('aria-expanded') !== 'true';
  const expanded = open && !isDesktop.matches;
  nav.setAttribute('aria-expanded', expanded);
  button.setAttribute('aria-expanded', expanded);
  button.setAttribute('aria-label', expanded ? 'Navigation schließen' : 'Navigation öffnen');
  document.body.style.overflowY = expanded ? 'hidden' : '';
}

/**
 * loads and decorates the header
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navData = await fetchNav();
  block.textContent = '';
  if (!navData) return;

  const fragment = document.createElement('div');
  fragment.innerHTML = navData.html;
  resolveImages(fragment, navData.base);

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Hauptnavigation');

  [...fragment.children].forEach((section, i) => {
    const name = SECTION_NAMES[i];
    if (!name) return;
    section.classList.add(`nav-${name}`);
    nav.append(section);
  });

  const brand = nav.querySelector('.nav-brand');
  if (brand) {
    const logos = brand.querySelectorAll(':scope > p');
    logos.forEach((p, i) => p.classList.add(i === 0 ? 'nav-brand-full' : 'nav-brand-compact'));
  }

  const meta = nav.querySelector('.nav-meta');
  const tools = nav.querySelector('.nav-tools');
  [meta, tools].forEach((section) => section && addIconKeys(section));

  const search = nav.querySelector('.nav-search');
  if (search) buildSearch(search);

  // hamburger (compact screens only)
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  const hamburgerButton = document.createElement('button');
  hamburgerButton.type = 'button';
  hamburgerButton.setAttribute('aria-controls', 'nav-menu');
  hamburgerButton.innerHTML = '<span class="nav-hamburger-icon"></span>';
  hamburgerButton.addEventListener('click', () => toggleMenu(nav));
  hamburger.append(hamburgerButton);

  const sections = nav.querySelector('.nav-sections');
  if (sections) sections.id = 'nav-menu';

  // order: brand, search, hamburger, main menu, meta + tools (bottom bar on compact screens)
  const bar = document.createElement('div');
  bar.className = 'nav-bar';
  bar.append(...[meta, tools].filter(Boolean));
  nav.replaceChildren(...[brand, search, hamburger, sections, bar].filter(Boolean));

  toggleMenu(nav, false);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.getAttribute('aria-expanded') === 'true') {
      toggleMenu(nav, false);
      hamburgerButton.focus();
    }
  });
  // crossing the breakpoint always resets the compact menu
  isDesktop.addEventListener('change', () => toggleMenu(nav, false));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
