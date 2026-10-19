const status = document.querySelector('#saved-status');
const results = document.querySelector('#saved-results');
const previousButton = document.querySelector('#saved-previous');
const nextButton = document.querySelector('#saved-next');
const pageLabel = document.querySelector('#saved-page');
const pagination = document.querySelector('#saved-pagination');

let currentPage = 1;
let totalPages = 0;
let requestId = 0;
let visibleCount = 0;

function setStatus(message, state) {
  status.textContent = message;
  status.dataset.state = state;
}

function savedSummary(saved) {
  const listeningStatus =
    saved.status === 'completed' ? 'Listened' : 'Want to listen';
  return saved.rating === null
    ? listeningStatus
    : `${listeningStatus} · ${saved.rating}/5`;
}

function makeField(savedId, name, labelText, control) {
  const field = document.createElement('div');
  field.className = 'form-field';
  const label = document.createElement('label');
  control.id = `${name}-${savedId}`;
  control.name = name;
  label.htmlFor = control.id;
  label.textContent = labelText;
  field.append(label, control);
  return field;
}

function makeSavedItem(saved) {
  const item = document.createElement('li');
  const title = document.createElement('strong');
  title.textContent = saved.item?.title ?? 'Song unavailable';
  const artist = document.createElement('span');
  artist.textContent = saved.item?.artist ?? '';
  const savedStatus = document.createElement('p');
  savedStatus.className = 'saved-detail';
  savedStatus.textContent = savedSummary(saved);

  const details = document.createElement('details');
  details.className = 'saved-editor';
  const summary = document.createElement('summary');
  summary.textContent = 'Edit saved song';
  const form = document.createElement('form');
  form.className = 'saved-form';

  const listeningSelect = document.createElement('select');
  for (const [value, label] of [
    ['planned', 'Want to listen'],
    ['completed', 'Listened'],
  ]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    listeningSelect.append(option);
  }
  listeningSelect.value = saved.status;

  const ratingSelect = document.createElement('select');
  for (const [value, label] of [
    ['', 'No rating'],
    ...[1, 2, 3, 4, 5].map((rating) => [String(rating), `${rating}/5`]),
  ]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    ratingSelect.append(option);
  }
  ratingSelect.value = saved.rating === null ? '' : String(saved.rating);

  const tagsInput = document.createElement('input');
  tagsInput.type = 'text';
  tagsInput.value = saved.personalTags.join(', ');
  const notesInput = document.createElement('textarea');
  notesInput.rows = 3;
  notesInput.value = saved.notes;

  const fields = document.createElement('div');
  fields.className = 'saved-fields';
  fields.append(
    makeField(saved.id, 'status', 'Listening status', listeningSelect),
    makeField(saved.id, 'rating', 'Rating', ratingSelect),
    makeField(
      saved.id,
      'personalTags',
      'Personal tags (comma separated)',
      tagsInput,
    ),
    makeField(saved.id, 'notes', 'Notes', notesInput),
  );

  const actions = document.createElement('div');
  actions.className = 'form-actions';
  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.className = 'primary-button';
  saveButton.textContent = 'Save changes';
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete-button';
  deleteButton.textContent = 'Delete saved song';
  actions.append(saveButton, deleteButton);

  const feedback = document.createElement('p');
  feedback.className = 'save-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  form.append(fields, actions, feedback);
  details.append(summary, form);
  item.append(title, artist, savedStatus, details);

  function setFeedback(message, state) {
    feedback.textContent = message;
    feedback.dataset.state = state;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    saveButton.disabled = true;
    deleteButton.disabled = true;
    setFeedback('Saving changes…', 'loading');

    const fields = new FormData(form);
    const rating = String(fields.get('rating'));
    const payload = {
      status: String(fields.get('status')),
      rating: rating ? Number(rating) : null,
      personalTags: String(fields.get('personalTags') ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: String(fields.get('notes') ?? ''),
    };

    try {
      const response = await fetch(`/api/saved-music/${saved.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message || 'Could not update saved song.');
      }
      savedStatus.textContent = savedSummary(body.data);
      setFeedback('Changes saved.', 'success');
    } catch (error) {
      setFeedback(error.message || 'Could not update saved song.', 'error');
    } finally {
      saveButton.disabled = false;
      deleteButton.disabled = false;
    }
  });

  deleteButton.addEventListener('click', async () => {
    if (!window.confirm(`Delete saved song "${title.textContent}"?`)) return;
    saveButton.disabled = true;
    deleteButton.disabled = true;
    setFeedback('Deleting saved song…', 'loading');

    try {
      const response = await fetch(`/api/saved-music/${saved.id}`, {
        method: 'DELETE',
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message || 'Could not delete saved song.');
      }
      resetSaveButtons(saved.itemId);
      const nextPage =
        visibleCount === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      await loadSavedMusic(nextPage);
    } catch (error) {
      setFeedback(error.message || 'Could not delete saved song.', 'error');
      saveButton.disabled = false;
      deleteButton.disabled = false;
    }
  });

  return item;
}

function showSavedSongs(body) {
  results.replaceChildren(...body.data.map(makeSavedItem));
  visibleCount = body.data.length;

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
  button.dataset.songId = song.id;
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
        markSaveButtons(song.id, body.error.message);
        return;
      }
      if (!response.ok) {
        throw new Error(body.error?.message || 'Could not save this song.');
      }
      markSaveButtons(song.id, 'Song saved.');
      await loadSavedMusic(1);
    } catch (error) {
      button.disabled = false;
      feedback.textContent = error.message || 'Could not save this song.';
      feedback.dataset.state = 'error';
    }
  });
}

function markSaveButtons(songId, message) {
  for (const button of document.querySelectorAll('button[data-song-id]')) {
    if (button.dataset.songId !== songId) continue;
    button.disabled = true;
    button.textContent = 'Saved';
    button.nextElementSibling.textContent = message;
    button.nextElementSibling.dataset.state = 'success';
  }
}

function resetSaveButtons(songId) {
  for (const button of document.querySelectorAll('button[data-song-id]')) {
    if (button.dataset.songId !== songId) continue;
    button.disabled = false;
    button.textContent = 'Save song';
    button.nextElementSibling.textContent = '';
  }
}

previousButton.addEventListener('click', () => loadSavedMusic(currentPage - 1));
nextButton.addEventListener('click', () => loadSavedMusic(currentPage + 1));

loadSavedMusic();
