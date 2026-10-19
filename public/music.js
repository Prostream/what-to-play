const form = document.querySelector('#music-search');
const clearButton = document.querySelector('#music-clear');
const status = document.querySelector('#music-status');
const results = document.querySelector('#music-results');
const previousButton = document.querySelector('#music-previous');
const nextButton = document.querySelector('#music-next');
const pageLabel = document.querySelector('#music-page');

let currentPage = 1;
let totalPages = 0;
let requestId = 0;

function searchParams(page) {
  const fields = new FormData(form);
  const params = new URLSearchParams({ page: String(page) });
  for (const name of ['q', 'genre', 'mood']) {
    const value = String(fields.get(name) ?? '').trim();
    if (value) params.set(name, value);
  }
  return params;
}

function showPage(data) {
  results.replaceChildren();
  for (const song of data.data) {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = song.title;
    const details = document.createElement('span');
    details.textContent = ` — ${song.artist}`;
    item.append(title, details);
    results.append(item);
  }

  currentPage = data.pagination.page;
  totalPages = data.pagination.totalPages;
  status.textContent = data.pagination.total
    ? `${data.pagination.total} songs found.`
    : 'No songs match these filters.';
  pageLabel.textContent = totalPages
    ? `Page ${currentPage} of ${totalPages}`
    : '';
  previousButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages;
}

async function loadPage(page) {
  const thisRequest = ++requestId;
  status.textContent = 'Loading music…';
  previousButton.disabled = true;
  nextButton.disabled = true;

  try {
    const response = await fetch(`/api/music?${searchParams(page)}`);
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error?.message || 'Could not load music.');
    }
    if (thisRequest !== requestId) return;
    showPage(body);
  } catch (error) {
    if (thisRequest !== requestId) return;
    results.replaceChildren();
    pageLabel.textContent = '';
    status.textContent = error.message || 'Could not load music.';
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  loadPage(1);
});

clearButton.addEventListener('click', () => {
  form.reset();
  loadPage(1);
});

previousButton.addEventListener('click', () => loadPage(currentPage - 1));
nextButton.addEventListener('click', () => loadPage(currentPage + 1));

loadPage(1);
