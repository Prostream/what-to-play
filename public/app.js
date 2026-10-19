const app = document.querySelector('#app');

const heading = document.createElement('h1');
heading.textContent = 'What to Play';

const description = document.createElement('p');
description.textContent =
  'Find your next game or song from the ones you already like.';

const musicLink = document.createElement('a');
musicLink.href = '/music.html';
musicLink.textContent = 'Music';

app.append(heading, description, musicLink);
