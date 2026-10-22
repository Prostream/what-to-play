import { el, button, link } from './dom.js';

export function gameCard(game, action, saved) {
  const card = el('article', 'game-card');
  const art = el('div', 'game-art');
  const image = el('img');
  image.src = game.image;
  image.alt = '';
  image.loading = 'lazy';
  image.addEventListener('error', () => image.remove(), { once: true });
  art.append(image);
  if (saved?.favorite) art.append(el('span', 'favorite-badge', '♥ Favorite'));
  const body = el('div', 'card-body');
  body.append(
    el('p', 'card-genre', game.genres.slice(0, 2).join(' · ')),
    el('h3', '', game.title),
  );
  const tagList = el('div', 'tags');
  for (const tag of game.tags.slice(0, 3))
    tagList.append(el('span', 'tag', tag));
  body.append(tagList);
  if (game.matchedTags)
    body.append(
      el(
        'p',
        'match-reason',
        `Matches ${game.matchedTags.slice(0, 4).join(', ')}`,
      ),
    );
  if (saved) {
    body.append(
      el(
        'p',
        'saved-meta',
        `${saved.status === 'completed' ? 'Played' : 'Want to play'}${saved.rating ? ` · ${saved.rating} / 5` : ''}`,
      ),
    );
    if (saved.notes) body.append(el('p', 'saved-notes', saved.notes));
    if (saved.personalTags.length)
      body.append(
        el(
          'p',
          'saved-meta',
          saved.personalTags.map((tag) => `#${tag}`).join(' '),
        ),
      );
  }
  const actions = el('div', 'card-actions');
  const save = button(
    saved ? 'Edit collection' : '+ Save game',
    () => action(game, save),
    'save-button',
  );
  actions.append(
    save,
    link(
      'Steam ↗',
      `https://store.steampowered.com/app/${game.steamId}/`, //one of my favorite features in this project is being able to go straight to the steam link
      'store-link',
    ),
  );
  body.append(actions);
  card.append(art, body);
  return card;
}
