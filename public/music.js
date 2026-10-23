import { addSaveButton, loadSavedMusic } from './saved-music.js';
import {
  initMusicAuth,
  musicSignedIn,
  requireMusicUser,
} from './music-auth.js';

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
const surpriseButton = document.querySelector('#surprise-me');
const chooseMoodButton = document.querySelector('#choose-mood');
const moodOptions = document.querySelector('#mood-options');
const discoverStatus = document.querySelector('#discover-status');
const discoverResults = document.querySelector('#discover-results');
const blacklistToggle = document.querySelector('#blacklist-toggle');
const blacklistPanel = document.querySelector('#blacklist-panel');
const blacklistStatus = document.querySelector('#blacklist-status');
const blacklistResults = document.querySelector('#blacklist-results');
const blacklistPagination = document.querySelector('#blacklist-pagination');
const blacklistPrevious = document.querySelector('#blacklist-previous');
const blacklistNext = document.querySelector('#blacklist-next');
const blacklistPageLabel = document.querySelector('#blacklist-page');

let currentPage = 1;
let totalPages = 0;
let requestId = 0;
let recommendationPage = 1;
let recommendationTotalPages = 0;
let recommendationRequestId = 0;
let browseLoaded = false;
let blacklistPage = 1;
let blacklistTotalPages = 0;
let blacklistRequestId = 0;

function showView(view) {
  if (view === 'saved' && !requireMusicUser(() => showView(view))) return;
  for (const button of document.querySelectorAll('[data-view]')) {
    if (button.dataset.view === view)
      button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  for (const name of ['discover', 'browse', 'saved']) {
    document.querySelector(`#${name}-view`).hidden = name !== view;
  }
  if (view === 'browse' && !browseLoaded) {
    browseLoaded = true;
    loadPage(1);
  }
  if (view === 'saved') loadSavedMusic();
  if (view === 'saved' && !blacklistPanel.hidden) loadBlacklist(blacklistPage);
}

for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => showView(button.dataset.view));
}

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

// This is basically api() from js/api.js, and the same fetch/json/throw
// pattern shows up a few more times below and in saved-music.js. Using api()
// everywhere would also let us catch a 401 and sign the user out properly.
async function requestMusic(path, options) {
  const response = await fetch(path, options);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message || 'Could not load music.');
  }
  return body;
}

function addBlacklistButton(actions, song) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'delete-button';
  button.textContent = 'Blacklist';
  const feedback = document.createElement('p');
  feedback.className = 'save-feedback';
  feedback.setAttribute('role', 'status');
  actions.append(button, feedback);

  button.addEventListener('click', async () => {
    if (!requireMusicUser(() => button.click())) return;
    button.disabled = true;
    feedback.textContent = 'Adding to blacklist…';
    feedback.dataset.state = 'loading';
    try {
      await requestMusic('/api/blacklisted-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: song.id }),
      });
      button.textContent = 'Blacklisted';
      actions.parentElement.classList.add('is-blacklisted');
      actions.querySelector('button[data-song-id]').disabled = true;
      feedback.textContent = 'This song will stay out of recommendations.';
      feedback.dataset.state = 'success';
      if (!blacklistPanel.hidden) loadBlacklist(1);
    } catch (error) {
      feedback.textContent = error.message || 'Could not blacklist this song.';
      feedback.dataset.state = 'error';
      button.disabled = false;
    }
  });
}

function renderDiscovery(songs) {
  discoverResults.replaceChildren();
  for (const song of songs) {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = song.title;
    const artist = document.createElement('span');
    artist.textContent = song.artist;
    const actions = document.createElement('div');
    actions.className = 'discovery-actions';
    addSaveButton(actions, song);
    addBlacklistButton(actions, song);
    item.append(title, artist, actions);
    discoverResults.append(item);
  }
}

async function loadDiscovery(mood = '') {
  surpriseButton.disabled = true;
  chooseMoodButton.disabled = true;
  setStatus(discoverStatus, 'Finding five songs…', 'loading');
  discoverResults.replaceChildren();
  moodOptions.hidden = true;
  chooseMoodButton.setAttribute('aria-expanded', 'false');

  try {
    const params = mood ? `?mood=${encodeURIComponent(mood)}` : '';
    const body = await requestMusic(`/api/music/discover${params}`);
    renderDiscovery(body.data);
    setStatus(
      discoverStatus,
      body.data.length
        ? `${body.data.length} songs for you. Choose another mood or try again.`
        : 'No songs available for this mood outside your blacklist.',
      body.data.length ? 'success' : 'empty',
    );
  } catch (error) {
    setStatus(
      discoverStatus,
      error.message || 'Could not load music.',
      'error',
    );
  } finally {
    surpriseButton.disabled = false;
    chooseMoodButton.disabled = false;
  }
}

surpriseButton.addEventListener('click', () => loadDiscovery());
chooseMoodButton.addEventListener('click', () => {
  moodOptions.hidden = !moodOptions.hidden;
  chooseMoodButton.setAttribute('aria-expanded', String(!moodOptions.hidden));
});
for (const button of moodOptions.querySelectorAll('[data-mood]')) {
  button.addEventListener('click', () => loadDiscovery(button.dataset.mood));
}

async function loadBlacklist(page = 1) {
  const thisRequest = ++blacklistRequestId;
  setStatus(blacklistStatus, 'Loading blacklisted songs…', 'loading');
  blacklistPrevious.disabled = true;
  blacklistNext.disabled = true;

  try {
    const body = await requestMusic(`/api/blacklisted-music?page=${page}`);
    if (thisRequest !== blacklistRequestId) return;
    if (!body.data.length && page > 1 && body.pagination.total) {
      return loadBlacklist(page - 1);
    }

    blacklistResults.replaceChildren();
    for (const record of body.data) {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = record.item?.title ?? 'Song unavailable';
      const artist = document.createElement('span');
      artist.textContent = record.item?.artist ?? '';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'delete-button';
      remove.textContent = 'Remove from blacklist';
      const feedback = document.createElement('p');
      feedback.className = 'save-feedback';
      feedback.setAttribute('role', 'status');
      item.append(title, artist, remove, feedback);
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        feedback.textContent = 'Removing…';
        try {
          await requestMusic(`/api/blacklisted-music/${record.itemId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          });
          await loadBlacklist(blacklistPage);
        } catch (error) {
          feedback.textContent =
            error.message || 'Could not remove this song from the blacklist.';
          feedback.dataset.state = 'error';
          remove.disabled = false;
        }
      });
      blacklistResults.append(item);
    }
    blacklistPage = body.pagination.page;
    blacklistTotalPages = body.pagination.totalPages;
    setStatus(
      blacklistStatus,
      body.pagination.total
        ? `${body.pagination.total} blacklisted songs.`
        : 'No blacklisted songs yet.',
      body.pagination.total ? 'success' : 'empty',
    );
    blacklistPageLabel.textContent = blacklistTotalPages
      ? `Page ${blacklistPage} of ${blacklistTotalPages}`
      : '';
    blacklistPrevious.disabled = blacklistPage <= 1;
    blacklistNext.disabled = blacklistPage >= blacklistTotalPages;
    blacklistPagination.hidden = blacklistTotalPages <= 1;
  } catch (error) {
    if (thisRequest !== blacklistRequestId) return;
    blacklistResults.replaceChildren();
    blacklistPagination.hidden = true;
    setStatus(
      blacklistStatus,
      error.message || 'Could not load the blacklist.',
      'error',
    );
  }
}

blacklistToggle.addEventListener('click', () => {
  blacklistPanel.hidden = !blacklistPanel.hidden;
  blacklistToggle.setAttribute('aria-expanded', String(!blacklistPanel.hidden));
  blacklistToggle.textContent = blacklistPanel.hidden
    ? 'View blacklist'
    : 'Hide blacklist';
  if (!blacklistPanel.hidden) loadBlacklist(1);
});
blacklistPrevious.addEventListener('click', () =>
  loadBlacklist(blacklistPage - 1),
);
blacklistNext.addEventListener('click', () => loadBlacklist(blacklistPage + 1));

initMusicAuth(() => {
  document.querySelector('#saved-results').replaceChildren();
  blacklistResults.replaceChildren();
  for (const button of document.querySelectorAll('button[data-song-id]')) {
    button.disabled = false;
    button.textContent = 'Save song';
    button.nextElementSibling.textContent = '';
  }
  if (!musicSignedIn() && !document.querySelector('#saved-view').hidden) {
    showView('discover');
  } else if (musicSignedIn() && !document.querySelector('#saved-view').hidden) {
    loadSavedMusic();
    if (!blacklistPanel.hidden) loadBlacklist(1);
  }
});

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
