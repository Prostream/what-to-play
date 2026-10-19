const app = document.querySelector('#app');

const heading = document.createElement('h1');
heading.textContent = 'What to Play';

const description = document.createElement('p');
description.textContent =
  'Find your next game or song from the ones you already like.';

app.append(heading, description);

const games = document.createElement('a');
games.href = '/games.html';
games.textContent = 'Discover games →';
const music = document.createElement('p');
music.textContent =
  'Music discovery page is coming soon. The Music API is ready.';
app.append(games, music);
