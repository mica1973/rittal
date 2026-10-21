import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';

const LABELS = {
  tablist: 'Produktbereiche',
  prev: 'Vorheriger Produktbereich',
  next: 'Nächster Produktbereich',
};

let instanceCount = 0;

/**
 * Builds a panel body from the authored content cell(s): image and text are
 * separated so the layout can place them side by side.
 * @param {Element[]} cells content cells (everything after the label cell)
 * @returns {{ media: Element, text: Element }}
 */
function buildPanelContent(cells) {
  const media = document.createElement('div');
  media.className = 'tabs-product-panel-image';
  const text = document.createElement('div');
  text.className = 'tabs-product-panel-text';

  cells.forEach((cell) => {
    [...cell.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return;
      text.append(node);
    });
  });

  const picture = text.querySelector('picture');
  if (picture) {
    const holder = picture.closest('a') || picture;
    const wrapper = holder.closest('p');
    media.append(holder);
    if (wrapper && !wrapper.textContent.trim() && !wrapper.querySelector('picture, img')) wrapper.remove();
  }

  media.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [
      { media: '(min-width: 900px)', width: '1000' },
      { width: '750' },
    ]));
  });

  return { media, text };
}

export default function decorate(block) {
  instanceCount += 1;
  const prefix = `tabs-product-${instanceCount}`;

  // option: start the alternating layout with the image on the right
  const startReversed = block.classList.contains('image-right');
  const rows = [...block.children].filter((row) => row.textContent.trim() || row.querySelector('picture'));

  const panels = document.createElement('div');
  panels.className = 'tabs-product-panels';

  const tablist = document.createElement('div');
  tablist.className = 'tabs-product-list';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', LABELS.tablist);

  const tabs = [];
  const usedIds = new Set();

  rows.forEach((row, i) => {
    const cells = [...row.children];
    let labelCell = null;
    let contentCells = cells;
    // first cell is the label when it is plain text and more cells follow
    if (cells.length > 1 && !cells[0].querySelector('picture')) {
      [labelCell, ...contentCells] = cells;
    }

    const { media, text } = buildPanelContent(contentCells);
    const heading = text.querySelector('h1, h2, h3, h4, h5, h6');
    const labelText = (labelCell?.textContent || heading?.textContent || `${i + 1}`).trim();

    let slug = toClassName(labelText) || `${i + 1}`;
    while (usedIds.has(slug)) slug = `${slug}-${i + 1}`;
    usedIds.add(slug);

    const panel = document.createElement('div');
    panel.className = 'tabs-product-panel';
    panel.classList.add((i % 2 === 1) !== startReversed ? 'tabs-product-panel-reverse' : 'tabs-product-panel-default');
    panel.id = `${prefix}-panel-${slug}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `${prefix}-tab-${slug}`);
    panel.tabIndex = 0;
    if (media.children.length) panel.append(media);
    else panel.classList.add('no-image');
    if (text.children.length) panel.append(text);
    panels.append(panel);

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tabs-product-tab';
    tab.id = `${prefix}-tab-${slug}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    tab.textContent = labelText;
    tablist.append(tab);
    tabs.push({ tab, panel });
  });

  if (!tabs.length) {
    block.replaceChildren();
    return;
  }

  const select = (index, focus = false) => {
    const target = ((index % tabs.length) + tabs.length) % tabs.length;
    tabs.forEach(({ tab, panel }, i) => {
      const active = i === target;
      tab.setAttribute('aria-selected', active);
      tab.tabIndex = active ? 0 : -1;
      panel.hidden = !active;
    });
    block.dataset.activeTab = target;
    const { tab } = tabs[target];
    if (focus) tab.focus();
    if (typeof tab.scrollIntoView === 'function' && focus) {
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  tabs.forEach(({ tab }, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = i + 1;
      else if (e.key === 'ArrowLeft') next = i - 1;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      select(next, true);
    });
  });

  const nav = document.createElement('div');
  nav.className = 'tabs-product-nav';

  if (tabs.length > 1) {
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'tabs-product-prev';
    prev.setAttribute('aria-label', LABELS.prev);
    prev.addEventListener('click', () => select(Number(block.dataset.activeTab) - 1));

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'tabs-product-next';
    next.setAttribute('aria-label', LABELS.next);
    next.addEventListener('click', () => select(Number(block.dataset.activeTab) + 1));

    nav.append(prev, tablist, next);
  } else {
    nav.append(tablist);
  }

  block.replaceChildren(panels, nav);
  select(0);
}
