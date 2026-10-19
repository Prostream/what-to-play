import { api, query } from './api.js';
import { $, el, button, message } from './dom.js';
import { initAuth, signedIn, signIn, expiredSession } from './auth.js';
import { gameCard } from './game-card.js';
import { createGuide } from './guide.js';

let view = 'discover';
let resultType = '';
let resultParams = {};
let resultPage = 1;
let request;
let editId;
const results = $('#results');
const grid = $('#game-grid');
const editDialog = $('#edit-dialog');
const editForm = $('#edit-form');

function clearResults() {
  request?.abort();
  results.hidden = true;
  grid.replaceChildren();
  $('#pagination').replaceChildren();
  resultType = '';
  $('#app-status').textContent = '';
}

function accountChanged() {
  if (['saved', 'favorites'].includes(view)) loadResults(view);
  else if (resultType && !signedIn())
    loadResults(resultType, resultParams, resultPage);
}

async function save(game, control) {
  if (!signedIn()) return signIn(() => save(game, control));
  control.disabled = true;
  try {
    await api('/saved-games', { method: 'POST', body: { itemId: game.id } });
    control.textContent = '✓ Saved';
    if (['saved', 'favorites'].includes(view)) await loadResults(view);
    $('#app-status').textContent = `${game.title} is in your saved games.`;
  } catch (error) {
    if (error.code === 'ALREADY_SAVED') {
      control.textContent = '✓ Saved';
      $('#app-status').textContent = error.message;
    } else {
      control.disabled = false;
      if (error.status === 401) {
        expiredSession();
        signIn(() => save(game, control));
      } else $('#app-status').textContent = message(error);
    }
  }
}

function edit(record) {
  editId = record.id;
  $('#edit-title').textContent = record.item.title;
  editForm.elements.status.value = record.status;
  editForm.elements.rating.value = record.rating || '';
  editForm.elements.personalTags.value = record.personalTags.join(', ');
  editForm.elements.notes.value = record.notes;
  editForm.elements.favorite.checked = record.favorite;
  $('#edit-error').textContent = '';
  editDialog.showModal();
}

async function changeSaved(method, body) {
  const controls = [...editForm.querySelectorAll('button')];
  controls.forEach((control) => {
    control.disabled = true;
  });
  $('#edit-error').textContent = '';
  try {
    await api(`/saved-games/${editId}`, { method, body });
    editDialog.close();
    await loadResults(view, {}, resultPage);
    $('#app-status').textContent =
      method === 'DELETE'
        ? 'Game removed from your collection.'
        : 'Your changes are saved.';
  } catch (error) {
    if (error.status === 401) {
      editDialog.close();
      expiredSession();
      signIn();
    } else $('#edit-error').textContent = message(error);
  } finally {
    controls.forEach((control) => {
      control.disabled = false;
    });
  }
}

editForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = new FormData(editForm);
  changeSaved('PATCH', {
    status: fields.get('status'),
    rating: fields.get('rating') ? Number(fields.get('rating')) : null,
    personalTags: fields
      .get('personalTags')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    notes: fields.get('notes'),
    favorite: fields.has('favorite'),
  });
});
$('#remove-game').addEventListener('click', () => {
  if (window.confirm('Remove this game and its notes from your collection?'))
    changeSaved('DELETE');
});

async function loadResults(type, params = {}, page = 1) {
  request?.abort();
  const controller = new AbortController();
  request = controller;
  resultType = type;
  resultParams = params;
  resultPage = page;
  results.hidden = false;
  grid.replaceChildren();
  $('#pagination').replaceChildren();
  $('#results-count').textContent = '';
  $('#results-status').textContent = 'Finding games…';
  const saved = ['saved', 'favorites'].includes(type);
  const labels = {
    similar: [
      'A LITTLE FAMILIAR. A LITTLE NEW.',
      'Because you know what you like',
    ],
    explore: ['A CHANGE OF SCENERY', 'Your next adventure'],
    browse: ['EXPLORE THE CATALOG', 'All games'],
    saved: ['PICK UP WHERE YOU LEFT OFF', 'Your collection'],
    favorites: ['THE ONES YOU LOVE', 'Your favorites'],
  };
  $('#results-caption').textContent = labels[type][0];
  $('#results-heading').textContent = labels[type][1];
  if (saved && !signedIn()) {
    $('#results-status').textContent =
      'Sign in to see your personal collection.';
    $('#pagination').append(button('Sign in', () => signIn(), 'primary'));
    return;
  }
  const paths = {
    browse: '/games',
    similar: '/games/recommendations',
    explore: '/games/explore',
    saved: '/saved-games',
    favorites: '/saved-games',
  };
  try {
    const result = await api(
      `${paths[type]}?${query({ ...params, ...(type === 'favorites' ? { favorite: true } : {}), page, limit: 6 })}`,
      { signal: controller.signal },
    );
    if (controller.signal.aborted) return;
    const { total, totalPages } = result.pagination;
    if (saved && !result.data.length && page > 1)
      return loadResults(type, params, page - 1);
    $('#results-count').textContent =
      `${total.toLocaleString()} ${total === 1 ? 'game' : 'games'}`;
    $('#results-status').textContent = result.data.length
      ? ''
      : saved
        ? 'Nothing here yet. Discover a game and save it to start your collection.'
        : 'No games match these choices. Try a different title or fewer filters.';
    for (const row of result.data) {
      const card = saved
        ? gameCard(row.item, () => edit(row), row)
        : gameCard(row, save);
      grid.append(card);
    }
    if (type === 'explore' && total)
      $('#pagination').append(
        button(
          'Show me another selection ↻',
          () => loadResults(type, params),
          'outline',
        ),
      );
    else if (totalPages > 1) {
      const previous = button(
        '← Previous',
        () => loadResults(type, params, page - 1),
        'outline',
      );
      previous.disabled = page === 1;
      const next = button(
        'Next →',
        () => loadResults(type, params, page + 1),
        'outline',
      );
      next.disabled = page === totalPages;
      $('#pagination').append(
        previous,
        el('span', '', `${page} / ${totalPages}`),
        next,
      );
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    if (error.status === 401) {
      expiredSession();
      return;
    }
    $('#results-status').textContent = message(error);
    $('#pagination').append(
      button('Try again', () => loadResults(type, params, page), 'outline'),
    );
  }
}

function showView(next) {
  view = next;
  clearResults();
  for (const control of document.querySelectorAll('[data-view]')) {
    if (control.dataset.view === view)
      control.setAttribute('aria-current', 'page');
    else control.removeAttribute('aria-current');
  }
  $('#discover-view').hidden = view !== 'discover';
  $('#browse-view').hidden = view !== 'browse';
  $('#saved-view').hidden = !['saved', 'favorites'].includes(view);
  $('#saved-heading').textContent =
    view === 'favorites' ? 'Your favorite games.' : 'Saved games.';
  if (view === 'browse')
    loadResults('browse', Object.fromEntries(new FormData($('#browse-form'))));
  if (['saved', 'favorites'].includes(view)) loadResults(view);
}

for (const control of document.querySelectorAll('[data-view]'))
  control.addEventListener('click', () => showView(control.dataset.view));
for (const control of document.querySelectorAll('[data-close]'))
  control.addEventListener('click', () =>
    $(`#${control.dataset.close}`).close(),
  );
$('#browse-form').addEventListener('submit', (event) => {
  event.preventDefault();
  loadResults('browse', Object.fromEntries(new FormData(event.target)));
});
$('#motion-toggle').addEventListener('click', () => {
  const paused = document.body.classList.toggle('motion-paused');
  $('#motion-toggle').setAttribute('aria-pressed', String(paused));
  $('#motion-toggle').textContent = paused
    ? 'Resume background'
    : 'Pause background';
});

async function start() {
  $('#chat-controls').replaceChildren();
  $('#app-status').textContent = 'Loading the game shelf…';
  try {
    const [{ data: metadata }, backgrounds] = await Promise.all([
      api('/games/filters'),
      api('/games/explore?limit=12'),
    ]);
    for (const [selector, entries] of [
      ['#browse-genre', metadata.genres],
      ['#browse-tag', metadata.tags],
    ]) {
      const select = $(selector);
      select.replaceChildren(select.options[0]);
      for (const value of entries) {
        const option = el('option', '', value);
        option.value = value;
        select.append(option);
      }
    }
    $('#catalog-count').textContent =
      `${metadata.total.toLocaleString()} games to discover`;
    $('#collage').replaceChildren();
    for (const game of backgrounds.data) {
      const image = el('img');
      image.src = game.image;
      image.alt = '';
      image.addEventListener('error', () => image.remove(), { once: true });
      $('#collage').append(image);
    }
    const guide = createGuide(metadata, loadResults, clearResults);
    guide.reset();
    $('#app-status').textContent = metadata.total
      ? ''
      : 'The catalog is empty. Run the game import to begin.';
  } catch (error) {
    $('#app-status').textContent = message(error);
    $('#chat-controls').append(button('Try loading again', start, 'primary'));
  }
}

initAuth(accountChanged).catch((error) => {
  $('#app-status').textContent = message(error);
});
start();
