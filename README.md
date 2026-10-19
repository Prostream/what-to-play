# What to Play

Find your next game or song from the ones you already like.

Team: Chunzhang Liu (Games), Ziyong Liu (Music).

Stack: Vanilla ES6, Node.js, Express, MongoDB (native driver).

## Development setup

Use Node.js 24. The exact version used locally, in CI, and on Render is recorded
in `.node-version`. No local MongoDB server, Docker, frontend framework, or build
step is required.

Install [Node.js 24](https://nodejs.org/en/download), then run the commands below
from the repository directory. On Windows, you can alternatively extract the
official Windows x64 ZIP into `.tools/node-v<VERSION>-win-x64`, using the version
in `.node-version`, and activate it in each new PowerShell terminal:

```powershell
. .\scripts\use-node.ps1
```

This changes only the current terminal's PATH. The portable runtime is ignored
by Git and is not included in a fresh clone.

```sh
npm ci
```

Copy `.env.example` to `.env` once, then set `MONGODB_URI` to your Atlas connection
string. Use `MONGODB_DB=what_to_play_dev` for development. The npm scripts load
`.env` automatically; existing system environment variables take precedence.
Do not commit `.env` or put credentials in `public/`.

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Node's watch mode restarts the
server after backend changes; refresh the browser after frontend changes. Use
`npm start` to run without watch mode. The current homepage works without a
database; game and music features are not implemented yet.

## MongoDB Atlas

1. Create an Atlas **Free** cluster.
2. Create a database user with read/write access to the project database. The
   database user is separate from your Atlas login.
3. Add your current public IP to the project's Network Access list.
4. Choose Connect > Drivers > Node.js and copy the connection string into the
   local `.env`. Replace credential placeholders and URL-encode special
   characters in the username/password.
5. Verify the connection and initialize the Games indexes:

```sh
npm run db:check
npm run db:init:games
```

`db:check` pings MongoDB and reports counts for `games`, `savedGames`, `songs`,
and `savedMusic`. It does not create sample records. `db:init:games` creates a
title index for `games` and a unique `itemId` index for `savedGames`; it can be
run again without deleting data. The Music owner manages Music's indexes.
Catalog import scripts and real datasets will be added during feature work.

Use a separate production database, `what_to_play`, for deployment. Configure
database-user permissions for the databases that user actually needs.

## Commands

| Command                 | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| `npm run dev`           | Start Express with automatic backend restarts          |
| `npm start`             | Start Express without watch mode                       |
| `npm run db:check`      | Check Atlas connectivity and collection counts         |
| `npm run db:init:games` | Create Games collections/indexes without deleting data |
| `npm run lint`          | Check JavaScript with ESLint                           |
| `npm run format`        | Format project files with Prettier                     |
| `npm run check`         | Run ESLint and check formatting                        |

The shared `TEAM_AGREEMENT.md` is excluded from automatic formatting to avoid
incidental changes to the team contract. GitHub Actions runs `npm run check` on
pull requests and pushes to the team's branches. CI needs no Atlas credentials.

## Deploy to Render

The initial homepage is deployed at
[what-to-play-9a69.onrender.com](https://what-to-play-9a69.onrender.com).
The existing service uses `main`, Node.js 24.22.0, `npm ci`, and `npm start` on
the Free plan. Atlas connection settings are stored in Render's environment,
with `what_to_play` as the production database. Local development uses
`what_to_play_dev`.

Merge changes through a pull request before deploying them from `main`.
The homepage does not query MongoDB yet; database-backed end-to-end verification
will follow feature implementation. Render's Auto-Deploy setting is **On Commit**.
After a merge, verify that the deployed commit matches `main`; use Manual Deploy
if the GitHub trigger does not start a deployment.

The following instructions describe recreating the service from the Blueprint;
do not create a second service if the existing one is being used.

`render.yaml` defines one **Free** Node.js web service for both the frontend and
API. The deployment uses `main`, `npm ci`, and `npm start`.

1. Review and merge the configuration into `main` through a pull request.
2. Sign in to Render and create a Blueprint from this GitHub repository.
3. Confirm the service is on the Free plan and supply `MONGODB_URI` when asked.
   The Blueprint sets `MONGODB_DB=what_to_play` and `NODE_ENV=production`.
4. Add the service's outbound IP ranges, shown in Render, to Atlas Network
   Access. Ensure its database user has access to the production database.
5. Deploy and open the provided HTTPS URL. Verify database-backed features once
   implemented and import the production catalog before demonstrating them.

Express listens on Render's `PORT` and serves `public/` directly. There is no
separate frontend deployment. `/api/health` checks that the web process responds;
it does **not** verify MongoDB connectivity. Use `db:check` with the intended
database environment to check MongoDB separately.

Free Render web services sleep after 15 idle minutes and can take about a minute
to wake. Open the site before a classroom demonstration. Database data lives in
Atlas and persists independently of the web service.

References: [Render Blueprints](https://render.com/docs/blueprint-spec),
[Render free instances](https://render.com/docs/free),
[Atlas connections](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).

## Team workflow

Chunzhang owns Games on `Chunzhang`; Ziyong owns Music on `Joshua`. Sync `main`,
develop and verify on your branch, push it, and open a PR into `main`. Coordinate
changes to shared server routing, navigation, and documentation. See
[TEAM_AGREEMENT.md](TEAM_AGREEMENT.md) for the API and data contract.

## Remaining course deliverables

Feature implementation, real catalog imports totaling more than 1,000 valid
records, the design document and mockups, a completed-app screenshot, class
link, deployment of the finished app, code review, narrated video, and submission
links remain to be completed. Infrastructure setup alone does not satisfy these
requirements.

## License

[MIT](LICENSE).
