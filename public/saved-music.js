const status = document.querySelector('#saved-status');
const results = document.querySelector('#saved-results');
const previousButton = document.querySelector('#saved-previous');
const nextButton = document.querySelector('#saved-next');
const pageLabel = document.querySelector('#saved-page');
const pagination = document.querySelector('#saved-pagination');

let currentPage = 1;
let totalPages = 0;
let requestId = 0;

function setStatus(message, state) {
  status.textContent = message;
  status.dataset.state = state;
}

function showSavedSongs(body) {
  results.replaceChildren();
  for (const saved of body.data) {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = saved.item?.title ?? 'Song unavailable';
    const artist = document.createElement('span');
    artist.textContent = saved.item?.artist ?? '';
    const savedStatus = document.createElement('p');
    savedStatus.className = 'saved-detail';
    savedStatus.textContent =
      saved.status === 'completed' ? 'Listened' : 'Want to listen';
    item.append(title, artist, savedStatus);
    results.append(item);
  }

  currentPage = body.pagination.page;
  totalPages = body.pagination.totalPages;
  setStatus(
    body.pagination.total
      ? `${body.pagination.total} saved songs.`
      : 'No saved songs yet.',
    body.pagination.total ? 'success' : 'empty',
  );
  pageLabel.textContent = totalPages
    ? `Page ${currentPage} of ${totalPages}`
    : '';
  previousButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages;
  pagination.hidden = totalPages <= 1;
}

export async function loadSavedMusic(page = 1) {
  const thisRequest = ++requestId;
  setStatus('Loading saved songs…', 'loading');
  previousButton.disabled = true;
  nextButton.disabled = true;

  try {
    const response = await fetch(`/api/saved-music?page=${page}`);
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error?.message || 'Could not load saved songs.');
    }
    if (thisRequest !== requestId) return;
    showSavedSongs(body);
  } catch (error) {
    if (thisRequest !== requestId) return;
    results.replaceChildren();
    pageLabel.textContent = '';
    pagination.hidden = true;
    setStatus(error.message || 'Could not load saved songs.', 'error');
  }
}

export function addSaveButton(item, song) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary-button';
  button.textContent = 'Save song';
  const feedback = document.createElement('p');
  feedback.className = 'save-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  item.append(button, feedback);

  button.addEventListener('click', async () => {
    button.disabled = true;
    feedback.textContent = 'Saving…';
    feedback.dataset.state = 'loading';

    try {
      const response = await fetch('/api/saved-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: song.id }),
      });
      const body = await response.json();
      if (response.status === 409 && body.error?.code === 'ALREADY_SAVED') {
        button.textContent = 'Saved';
        feedback.textContent = body.error.message;
        feedback.dataset.state = 'success';
        return;
      }
      if (!response.ok) {
        throw new Error(body.error?.message || 'Could not save this song.');
      }
      button.textContent = 'Saved';
      feedback.textContent = 'Song saved.';
      feedback.dataset.state = 'success';
      await loadSavedMusic(1);
    } catch (error) {
      button.disabled = false;
      feedback.textContent = error.message || 'Could not save this song.';
      feedback.dataset.state = 'error';
    }
  });
}

previousButton.addEventListener('click', () => loadSavedMusic(currentPage - 1));
nextButton.addEventListener('click', () => loadSavedMusic(currentPage + 1));

loadSavedMusic();
