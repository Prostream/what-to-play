const app = document.querySelector('#app');

const heading = document.createElement('h1');
heading.textContent = 'What to Play';

const description = document.createElement('p');
description.textContent =
  'Find your next game or song from the ones you already like.';

const games = document.createElement('a');
games.href = '/games.html';
games.textContent = 'Discover games →';

const music = document.createElement('a');
music.href = '/music.html';
music.textContent = 'Discover music →';

const gamesEntry = document.createElement('p');
gamesEntry.append(games);
const musicEntry = document.createElement('p');
musicEntry.append(music);

app.append(heading, description, gamesEntry, musicEntry);
