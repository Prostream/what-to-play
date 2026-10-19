import { api, query } from './api.js';
import { $, el, button, link, message } from './dom.js';

export function createGuide(metadata, showResults, clearResults) {
  const log = $('#chat-log');
  const controls = $('#chat-controls');
  let source = null;
  let genre = '';
  let mode = '';
  let liked = [];
  let searchController;

  function say(text, who = '') {
    log.append(el('p', `bubble ${who}`, text));
    log.scrollTop = log.scrollHeight;
  }

  function choose(label, next) {
    return button(label, () => {
      controls.replaceChildren();
      say(label, 'user');
      next();
    });
  }

  function chooseMode() {
    say('How would you like to discover your next game?');
    controls.append(
      choose('♡ Something like a game I love', searchGame),
      choose('↗ Explore a genre', () => chooseGenre('explore')),
      choose('▷ Find videos on YouTube', () => chooseGenre('videos')),
    );
  }

  function searchGame() {
    mode = 'similar';
    say('Which game do you have in mind? Search its title below.');
    const form = el('form', 'chat-search');
    const label = el('label', '', 'Game title');
    const input = el('input');
    input.type = 'search';
    input.required = true;
    input.maxLength = 100;
    input.placeholder = 'Try a game you already love';
    label.append(input);
    const submit = el('button', 'primary', 'Search');
    const matches = el('div', 'search-matches');
    matches.setAttribute('aria-live', 'polite');
    form.append(label, submit, matches);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      searchController?.abort();
      searchController = new AbortController();
      submit.disabled = true;
      matches.replaceChildren(el('p', 'form-hint', 'Searching…'));
      try {
        const result = await api(
          `/games?${query({ q: input.value.trim(), limit: 6 })}`,
          { signal: searchController.signal },
        );
        matches.replaceChildren();
        if (!result.data.length)
          matches.append(
            el(
              'p',
              'form-hint',
              'No matching games in this catalog. Try another title or explore a genre.',
            ),
          );
        for (const game of result.data) {
          matches.append(
            choose(game.title, () => {
              source = game;
              chooseTags();
            }),
          );
        }
      } catch (error) {
        if (error.name !== 'AbortError')
          matches.replaceChildren(el('p', 'error', message(error)));
      } finally {
        submit.disabled = false;
      }
    });
    controls.append(
      form,
      choose('Explore a genre instead', () => chooseGenre('explore')),
    );
    input.focus();
  }

  function chooseGenre(nextMode) {
    searchController?.abort();
    mode = nextMode;
    say(
      mode === 'videos'
        ? 'What kind of games would you like to watch?'
        : 'What kind of world shall we step into?',
    );
    const options = [
      'action',
      'adventure',
      'rpg',
      'strategy',
      'simulation',
      'casual',
      'racing',
      'sports',
      'indie',
    ];
    controls.append(
      choose('Surprise me · any genre', () => {
        genre = '';
        mode === 'videos' ? showVideos() : chooseTags();
      }),
    );
    for (const name of options.filter((name) =>
      metadata.genres.includes(name),
    )) {
      controls.append(
        choose(name, () => {
          genre = name;
          mode === 'videos' ? showVideos() : chooseTags();
        }),
      );
    }
  }

  function tagForm(tags, selected, exclude, onSubmit) {
    const form = el('form', 'tag-form');
    const options = el('div', 'tag-options');
    for (const tag of tags) {
      const label = el('label', `tag-option${exclude ? ' exclusion' : ''}`);
      const input = el('input');
      input.type = 'checkbox';
      input.name = 'tag';
      input.value = tag;
      input.checked = selected.includes(tag);
      label.append(input, el('span', '', tag));
      options.append(label);
    }
    const submit = el(
      'button',
      'primary',
      exclude ? 'Find my games →' : 'Continue →',
    );
    const error = el('p', 'error');
    error.setAttribute('role', 'alert');
    form.append(options, error, submit);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const chosen = new FormData(form).getAll('tag');
      if (!exclude && mode === 'similar' && !chosen.length) {
        error.textContent = 'Choose at least one thing you enjoy.';
        return;
      }
      controls.replaceChildren();
      say(
        chosen.length
          ? `${exclude ? 'Skip' : 'I enjoy'}: ${chosen.join(', ')}`
          : exclude
            ? 'Nothing to skip.'
            : 'I’m open to anything.',
        'user',
      );
      onSubmit(chosen);
    });
    controls.append(form);
  }

  function chooseTags() {
    say(
      mode === 'similar'
        ? `What do you enjoy about ${source.title}? Keep the tags that fit.`
        : 'Anything you especially enjoy? Pick a few, or keep it open.',
    );
    const options =
      mode === 'similar'
        ? source.tags.slice(0, 20)
        : metadata.tags.slice(0, 18);
    tagForm(options, mode === 'similar' ? options : [], false, (chosen) => {
      liked = chosen;
      chooseExclusions();
    });
  }

  function chooseExclusions() {
    say('Anything you’d rather avoid? Games with these tags will be left out.');
    tagForm(metadata.tags.slice(0, 24), [], true, (disliked) => {
      const params = {
        genre: mode === 'explore' ? genre : '',
        sourceId: mode === 'similar' ? source.id : undefined,
        likedTag: liked,
        dislikedTag: disliked,
      };
      say(
        mode === 'similar'
          ? 'Here are games that share your favorite tags. Your original game is left out.'
          : 'Let’s try something new. Here’s a random selection within your choices.',
      );
      showResults(mode, params);
      controls.append(choose('Try a different direction', chooseMode));
    });
  }

  function showVideos() {
    say(
      'These links open YouTube search. Choose a direction to find recommendations and watch gameplay.',
    );
    const year = new Date().getFullYear();
    for (const [label, term] of [
      [
        'New game recommendations ↗',
        `new ${genre} games recommendations ${year}`,
      ],
      ['Upcoming games ↗', `upcoming ${genre} games ${year}`],
      ['Hidden gems ↗', `${genre} games hidden gems ${year}`],
    ])
      controls.append(
        link(
          label,
          `https://www.youtube.com/results?${query({ search_query: term })}`,
          'choice video-link',
        ),
      );
    controls.append(choose('Back to game discovery', chooseMode));
  }

  function reset() {
    searchController?.abort();
    source = null;
    genre = '';
    liked = [];
    clearResults();
    log.replaceChildren();
    controls.replaceChildren();
    say('Hey there! Ready to find something good to play?');
    controls.append(
      choose('Yes, let’s find a game →', chooseMode),
      choose('Not right now', () => {
        say(
          'No rush. Your next adventure can wait. Browse the catalog or come back whenever you like.',
        );
        controls.append(choose('Actually, let’s explore', chooseMode));
      }),
    );
  }
  $('#restart').addEventListener('click', reset);
  return { reset };
}
