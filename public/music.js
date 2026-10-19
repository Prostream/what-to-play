import { addSaveButton } from './saved-music.js';

const form = document.querySelector('#music-search');
const clearButton = document.querySelector('#music-clear');
const status = document.querySelector('#music-status');
const results = document.querySelector('#music-results');
const previousButton = document.querySelector('#music-previous');
const nextButton = document.querySelector('#music-next');
const pageLabel = document.querySelector('#music-page');
const recommendationsForm = document.querySelector('#recommendations-form');
const recommendationsStatus = document.querySelector('#recommendations-status');
const recommendationsResults = document.querySelector(
  '#recommendations-results',
);
const recommendationsPrevious = document.querySelector(
  '#recommendations-previous',
);
const recommendationsNext = document.querySelector('#recommendations-next');
const recommendationsPageLabel = document.querySelector(
  '#recommendations-page',
);

let currentPage = 1;
let totalPages = 0;
let requestId = 0;
let recommendationPage = 1;
let recommendationTotalPages = 0;
let recommendationRequestId = 0;

function searchParams(page) {
  const fields = new FormData(form);
  const params = new URLSearchParams({ page: String(page) });
  for (const name of ['q', 'genre', 'mood']) {
    const value = String(fields.get(name) ?? '').trim();
    if (value) params.set(name, value);
  }
  return params;
}

function renderSongs(target, songs) {
  target.replaceChildren();
  for (const song of songs) {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = song.title;
    const details = document.createElement('span');
    details.textContent = song.artist;
    item.append(title, details);
    addSaveButton(item, song);
    target.append(item);
  }
}

function setStatus(element, message, state) {
  element.textContent = message;
  element.dataset.state = state;
}

function showPage(data) {
  renderSongs(results, data.data);
  currentPage = data.pagination.page;
  totalPages = data.pagination.totalPages;
  setStatus(
    status,
    data.pagination.total
      ? `${data.pagination.total} songs found.`
      : 'No songs match these filters.',
    data.pagination.total ? 'success' : 'empty',
  );
  pageLabel.textContent = totalPages
    ? `Page ${currentPage} of ${totalPages}`
    : '';
  previousButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages;
}

async function loadPage(page) {
  const thisRequest = ++requestId;
  setStatus(status, 'Loading music…', 'loading');
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
    setStatus(status, error.message || 'Could not load music.', 'error');
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

function parseTags(value) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function recommendationParams(page) {
  const fields = new FormData(recommendationsForm);
  const likedTags = parseTags(String(fields.get('likedTags') ?? ''));
  if (likedTags.length === 0) return null;

  const params = new URLSearchParams({ page: String(page) });
  for (const tag of likedTags) params.append('likedTag', tag);
  for (const tag of parseTags(String(fields.get('dislikedTags') ?? ''))) {
    params.append('dislikedTag', tag);
  }
  return params;
}

async function loadRecommendations(page) {
  const thisRequest = ++recommendationRequestId;
  const params = recommendationParams(page);
  if (!params) {
    setStatus(
      recommendationsStatus,
      'Enter at least one tag you like.',
      'error',
    );
    recommendationsResults.replaceChildren();
    recommendationsPageLabel.textContent = '';
    recommendationsPrevious.disabled = true;
    recommendationsNext.disabled = true;
    return;
  }

  setStatus(recommendationsStatus, 'Loading recommendations…', 'loading');
  recommendationsPrevious.disabled = true;
  recommendationsNext.disabled = true;

  try {
    const response = await fetch(`/api/music/recommendations?${params}`);
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error?.message || 'Could not load recommendations.');
    }
    if (thisRequest !== recommendationRequestId) return;

    renderSongs(recommendationsResults, body.data);
    recommendationPage = body.pagination.page;
    recommendationTotalPages = body.pagination.totalPages;
    setStatus(
      recommendationsStatus,
      body.pagination.total
        ? `${body.pagination.total} recommended songs found.`
        : 'No songs match these tags.',
      body.pagination.total ? 'success' : 'empty',
    );
    recommendationsPageLabel.textContent = recommendationTotalPages
      ? `Page ${recommendationPage} of ${recommendationTotalPages}`
      : '';
    recommendationsPrevious.disabled = recommendationPage <= 1;
    recommendationsNext.disabled =
      recommendationPage >= recommendationTotalPages;
  } catch (error) {
    if (thisRequest !== recommendationRequestId) return;
    recommendationsResults.replaceChildren();
    recommendationsPageLabel.textContent = '';
    setStatus(
      recommendationsStatus,
      error.message || 'Could not load recommendations.',
      'error',
    );
  }
}

recommendationsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  loadRecommendations(1);
});
recommendationsPrevious.addEventListener('click', () =>
  loadRecommendations(recommendationPage - 1),
);
recommendationsNext.addEventListener('click', () =>
  loadRecommendations(recommendationPage + 1),
);

loadPage(1);
