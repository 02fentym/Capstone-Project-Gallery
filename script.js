/* Paste the CSV URL supplied by Google Sheets → File → Share → Publish to web.
   Publish a public gallery tab, excluding email and internal columns. */
const GALLERY_CONFIG = Object.freeze({
  csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSEa4xl1JVP3I_bsTFwX2f7Xvx2S9FKX9emk6EH1GUSjrbmLev8hX_rckqTIIiQPa3cWrINw2RStH8r/pub?gid=1960801988&single=true&output=csv',
  imageDirectory: 'images/',
  imageExtensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
});

// Handles quoted commas, escaped quotes, multiline cells, CRLF, and a UTF-8 BOM.
function parseCSV(source) {
  const text = source.replace(/^\uFEFF/, '');
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else if (quoted || field === '') quoted = !quoted;
      else field += char;
    } else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (quoted) throw new Error('Incomplete CSV response.');
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(cells => cells.some(value => value.trim()));
}

function imageBasename(first, last) {
  return `${first.trim()} ${last.trim()}`.normalize('NFKD')
    .replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
}

function projectsFromRows(rows) {
  if (!rows.length) throw new Error('The sheet is empty.');
  const headers = rows[0].map(value => value.trim().toLowerCase());
  for (const required of ['first name', 'last name', 'project title']) {
    if (!headers.includes(required)) throw new Error(`Missing required column: ${required}.`);
  }
  // An explicit allowlist keeps email addresses and internal fields out of the UI.
  const publicFields = ['First Name', 'Last Name', 'Project Title', 'Project Idea', 'ICT Area(s)',
    'The Problem', 'Target Audience', 'User Need', 'User Experience', 'Minimum Version',
    'Inspiration', 'Existing Skills', 'New Skills', 'Tools', 'Testing', 'Success'];
  return rows.slice(1).map((cells, index) => {
    const project = { index };
    for (const key of publicFields) project[key] = (cells[headers.indexOf(key.toLowerCase())] || '').trim();
    project.name = [project['First Name'], project['Last Name']].filter(Boolean).join(' ');
    project.basename = imageBasename(project['First Name'], project['Last Name']);
    project.areas = [...new Set(project['ICT Area(s)'].split(/[,;\n]/).map(value => value.trim()).filter(Boolean))];
    return project;
  }).filter(project => project.name && project['Project Title']);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function projectVisual(project) {
  const visual = element('div', 'project-visual');
  const palette = ['#202d32', '#28352a', '#383024', '#2d2937', '#233430'];
  visual.style.setProperty('--visual-bg', palette[project.index % palette.length]);
  const initials = project.name.split(/\s+/).map(part => Array.from(part)[0]).slice(0, 2).join('');
  const monogram = element('span', 'visual-monogram', initials);
  monogram.setAttribute('aria-hidden', 'true');
  const caption = element('span', 'visual-caption', 'PROJECT IMAGE COMING SOON');
  visual.append(monogram, caption);
  let attempt = 0;
  const img = new Image(); img.alt = `Project image for ${project['Project Title']}`;
  img.loading = 'lazy'; img.decoding = 'async'; img.style.opacity = '0';
  visual.append(img);
  img.onload = () => { monogram.hidden = true; caption.hidden = true; img.style.opacity = '1'; };
  img.onerror = () => { if (attempt < GALLERY_CONFIG.imageExtensions.length) tryNext(); else img.remove(); };
  function tryNext() { img.src = `${GALLERY_CONFIG.imageDirectory}${encodeURIComponent(project.basename)}.${GALLERY_CONFIG.imageExtensions[attempt++]}`; }
  if (project.basename) tryNext();
  return visual;
}

function tags(project, limit = project.areas.length) {
  const container = element('div', 'project-tags');
  project.areas.slice(0, limit).forEach(area => container.append(element('span', 'tag', area)));
  return container;
}

function initializeGallery() {
  const search = document.querySelector('#search');
  const sort = document.querySelector('#sort');
  const gallery = document.querySelector('#gallery');
  const filters = document.querySelector('#filters');
  const notice = document.querySelector('#notice');
  const dialog = document.querySelector('#project-dialog');
  let projects = [], selectedArea = '', previousFocus;

  function showDetail(project, trigger) {
    previousFocus = trigger;
    const content = document.querySelector('#detail-content'); content.replaceChildren();
    content.append(projectVisual(project));
    const title = element('h2', '', project['Project Title']); title.id = 'detail-title';
    content.append(title, element('p', 'student', `A project by ${project.name}`), tags(project));
    const sections = [['Project Idea', 'The idea'], ['The Problem', 'The problem'], ['Target Audience', 'Who it’s for'],
      ['User Need', 'The user need'], ['User Experience', 'The experience'], ['Minimum Version', 'The first version'],
      ['Inspiration', 'Inspiration'], ['Existing Skills', 'Skills so far'], ['New Skills', 'Skills to explore'],
      ['Tools', 'Tools & materials'], ['Testing', 'Testing & feedback'], ['Success', 'What success looks like']];
    for (const [key, label] of sections) {
      if (!project[key]) continue;
      const section = element('section', 'detail-section');
      section.append(element('h3', '', label), element('p', '', project[key])); content.append(section);
    }
    dialog.showModal(); dialog.scrollTop = 0;
    document.querySelector('#close-dialog').focus();
  }
  document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => previousFocus?.focus());

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const visible = projects.filter(project => (!selectedArea || project.areas.includes(selectedArea)) &&
      `${project.name} ${project['Project Title']} ${project['Project Idea']} ${project['ICT Area(s)']}`.toLocaleLowerCase().includes(query));
    if (sort.value === 'title') visible.sort((a, b) => a['Project Title'].localeCompare(b['Project Title']));
    if (sort.value === 'student') visible.sort((a, b) => a.name.localeCompare(b.name));
    gallery.replaceChildren();
    for (const project of visible) {
      const card = element('article', 'project'); const body = element('div', 'project-body');
      body.append(element('p', 'student', project.name), element('h3', '', project['Project Title']),
        element('p', 'description', project['Project Idea'] || 'Explore this student’s capstone project.'), tags(project, 2));
      const button = element('button', 'project-open');
      const label = element('span', 'sr-only', 'View project details'); button.append(label);
      button.setAttribute('aria-label', `Explore ${project['Project Title']} by ${project.name}`);
      button.append(element('span', 'open-arrow', '↗'));
      button.setAttribute('aria-haspopup', 'dialog'); button.addEventListener('click', () => showDetail(project, button));
      card.append(projectVisual(project), body, button); gallery.append(card);
    }
    document.querySelector('#result-count').textContent = `${visible.length} of ${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`;
    document.querySelector('#empty').hidden = visible.length > 0;
    document.querySelector('#reset').hidden = !query && !selectedArea;
    for (const button of filters.children) button.setAttribute('aria-pressed', String(button.dataset.area === selectedArea));
  }
  function reset() { search.value = ''; selectedArea = ''; render(); }
  search.addEventListener('input', render); sort.addEventListener('change', render);
  document.querySelector('#reset').addEventListener('click', reset);
  document.querySelector('#empty-reset').addEventListener('click', reset);

  async function load() {
    notice.hidden = true; gallery.setAttribute('aria-busy', 'true');
    search.disabled = true; sort.disabled = true; document.querySelector('#reset').hidden = true;
    document.querySelector('#result-count').textContent = 'Connecting to the collection…';
    try {
      const response = await fetch(GALLERY_CONFIG.csvUrl, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
      if (!response.ok) throw new Error(`Google Sheets returned ${response.status}.`);
      const csv = await response.text();
      if (/^\s*</.test(csv)) throw new Error('Google Sheets returned a page instead of CSV.');
      projects = projectsFromRows(parseCSV(csv));
      filters.replaceChildren();
      const areas = ['', ...[...new Set(projects.flatMap(project => project.areas))].sort()];
      for (const area of areas) {
        const button = element('button', 'filter', area || 'All projects'); button.dataset.area = area;
        button.addEventListener('click', () => { selectedArea = area; render(); }); filters.append(button);
      }
      search.disabled = false; sort.disabled = false; render();
    } catch (error) {
      gallery.replaceChildren(); filters.replaceChildren(); document.querySelector('#empty').hidden = true;
      document.querySelector('#result-count').textContent = 'Collection unavailable';
      notice.replaceChildren(element('h3', '', 'The collection is not connected yet'),
        element('p', '', 'The project sheet may need to be published, or the connection may be temporarily unavailable. Please try again shortly.'));
      const retry = element('button', 'primary-link', 'Try again ↻'); retry.addEventListener('click', load); notice.append(retry); notice.hidden = false;
      console.warn('Gallery connection:', error.message);
    } finally { gallery.setAttribute('aria-busy', 'false'); }
  }
  load();
}
if (typeof document !== 'undefined') initializeGallery();
if (typeof module !== 'undefined') module.exports = { parseCSV, imageBasename, projectsFromRows };
