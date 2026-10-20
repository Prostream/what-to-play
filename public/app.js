const app = document.querySelector('#app');

app.innerHTML = `
  <section class="intro" aria-labelledby="home-heading">
    <p class="eyebrow">LESS SCROLLING. MORE ENJOYING.</p>
    <h1 id="home-heading">What are you <em>in the mood for?</em></h1>
    <p>Find a game to play or a song to listen to. Pick where you want to start.</p>
  </section>
  <section class="choices" aria-label="Choose games or music">
    <a class="choice-card games-card" href="/games.html">
      <span class="card-mark" aria-hidden="true">G</span>
      <span class="card-category">GAMES</span>
      <strong>Find your next game.</strong>
      <span class="card-description">Get a recommendation, browse games, and keep your favorites.</span>
      <span class="card-action">Explore games <span aria-hidden="true">→</span></span>
    </a>
    <a class="choice-card music-card" href="/music.html">
      <span class="card-mark" aria-hidden="true">M</span>
      <span class="card-category">MUSIC</span>
      <strong>Find your next song.</strong>
      <span class="card-description">Try five songs, choose a mood, and save what you like.</span>
      <span class="card-action">Explore music <span aria-hidden="true">→</span></span>
    </a>
  </section>
`;
