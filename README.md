# What to Play

Discover games and music by title, genre, and tags, and track your favorites.

**Team:** Chunzhang Liu (Games), Ziyong Liu (Music). **Stack:** Vanilla ES6, Node.js 24, Express, MongoDB native driver.

**Demo:** [what-to-play-9a69.onrender.com](https://what-to-play-9a69.onrender.com)

## Run locally

1. Install Node.js 24 and run `npm ci`.
2. Copy `.env.example` to `.env`; configure each module's Atlas connection.
3. Keep Games on `MONGODB_DB=what_to_play_dev`; set Music's database separately.
4. Run `npm run db:seed:games` and, when Music is configured, `npm run db:seed:music`.
5. Run `npm run dev`, then open [localhost:3000](http://localhost:3000).

Scripts load `.env` automatically. Allow your current IP in Atlas Network Access.
No local MongoDB installation is needed. Keep credentials out of Git and `public/`.
For the optional portable Windows runtime, run `. .\scripts\use-node.ps1`;
the runtime is not included in a fresh clone.

## Database and commands

| Module | Connection variables                    | Collections                                        |
| ------ | --------------------------------------- | -------------------------------------------------- |
| Games  | `MONGODB_URI`, `MONGODB_DB`             | `games`, `savedGames`, account/session collections |
| Music  | `MUSIC_MONGODB_URI`, `MUSIC_MONGODB_DB` | `songs`, `savedMusic`                              |

Use separate database names, even when both modules use one Atlas cluster.
Music defaults to `what_to_play_music`; Games defaults to `what_to_play`.

| Command                                 | Purpose                                         |
| --------------------------------------- | ----------------------------------------------- |
| `npm run dev` / `npm start`             | Start with / without backend auto-restart       |
| `npm run db:check`                      | Check the Games database connection and counts  |
| `npm run db:init:games`                 | Create Games/account indexes                    |
| `npm run db:seed:games`                 | Import 1,500 games                              |
| `npm run db:seed:music`                 | Import the Music catalog                        |
| `npm test` / `npm run test:integration` | Local checks / isolated Atlas integration tests |
| `npm run format` / `npm run check`      | Format / check ESLint and formatting            |

See [Games details](docs/games.md) and [Music API details](docs/music.md).
Data sources and licenses: [Games](data/README.md), [Music](data/music/README.md).
GitHub Actions runs formatting, lint, and local tests on pushes and PRs.

## Deployment

Render serves the frontend and API from `main`: build `npm ci`, start `npm start`.
Configure both modules' connection variables plus `NODE_ENV=production`;
use `MONGODB_DB=what_to_play` and `MUSIC_MONGODB_DB=what_to_play_music`.
Allow Render's outbound IP ranges in Atlas and import each production catalog once.
`render.yaml` describes the service; do not create a duplicate of the existing one.
After merging, verify the deployed commit; use Manual Deploy if needed.
`/api/health` checks the server, not database connectivity. Free instances sleep when idle.

## Workflow and status

Develop Games on `Chunzhang` and Music on `Joshua`, then open PRs into `main`.
See [TEAM_AGREEMENT.md](TEAM_AGREEMENT.md) for module boundaries.
Games supports guided discovery, accounts, private collections, and favorites at `/games.html`.
YouTube opens external searches. Music search, recommendations, and shared saved-song APIs
are implemented; its page is pending. Remaining deliverables include design mockups,
class link, screenshots, code review, narrated video, and submission links.

## License

[MIT](LICENSE); catalog licenses are documented separately above.
