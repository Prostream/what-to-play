# What to Play

Discover games and music by title, genre, and tags, and track your favorites.

**Team:** Chunzhang Liu (Games), Ziyong Liu (Music).

**Stack:** Vanilla ES6, Node.js 24, Express, MongoDB native driver.

**Demo:** [what-to-play-9a69.onrender.com](https://what-to-play-9a69.onrender.com)

## Run locally

1. Install Node.js 24 (version pinned in `.node-version`).
2. Run `npm ci`.
3. Copy `.env.example` to `.env` and set your Atlas `MONGODB_URI`.
4. Keep `MONGODB_DB=what_to_play_dev`, then run `npm run dev`.
5. Open [localhost:3000](http://localhost:3000).

Scripts load `.env` automatically. Keep credentials out of Git and `public/`.
No local MongoDB installation is needed. If using the optional portable Windows
runtime in `.tools/node-v<VERSION>-win-x64`, activate it with
`. .\scripts\use-node.ps1`; this runtime is not included in a fresh clone.

## Database and commands

Create an Atlas Free cluster, a database user, and allow your current IP in
Network Access. Copy the Node.js connection string into `.env`.

| Command                 | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `npm run dev`           | Start with backend auto-restart                 |
| `npm start`             | Start without watch mode                        |
| `npm run db:check`      | Verify MongoDB connection and collection counts |
| `npm run db:init:games` | Create Games indexes without deleting data      |
| `npm run format`        | Format files with Prettier                      |
| `npm run check`         | Run ESLint and formatting checks                |

Games uses `games` and `savedGames`; Music uses `songs` and `savedMusic`.
The Games initializer enforces one saved entry per game. Catalog imports are
not implemented yet. GitHub Actions runs the code checks on pushes and PRs.

## Deployment

Render serves both the frontend and API from `main` on a Free instance:
`npm ci` installs dependencies; `npm start` runs the server. Configure
`MONGODB_URI`, `MONGODB_DB=what_to_play`, and `NODE_ENV=production` in Render,
and allow its outbound IP ranges in Atlas. `render.yaml` provides a Blueprint
for recreating the service; do not create a duplicate of the existing service.

After merging, verify the deployed commit; use Manual Deploy if needed.
`/api/health` checks the server, not the database. Free instances sleep when idle,
so open the site before a demo.

## Workflow and status

Develop Games on `Chunzhang` and Music on `Joshua`, then open PRs into `main`.
See [TEAM_AGREEMENT.md](TEAM_AGREEMENT.md) for ownership and API contracts.

The homepage and infrastructure are ready; game and music features remain to be
built. Remaining deliverables include 1,000+ catalog records, design mockups,
class link, app screenshots, code review, narrated video, and submission links.

## License

[MIT](LICENSE).
