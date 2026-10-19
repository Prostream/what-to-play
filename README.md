# What to Play

Find your next game or song from the ones you already like.

Team: Chunzhang Liu (Games), Ziyong Liu (Music).

Stack: Vanilla ES6, Node.js, Express, MongoDB (native driver).

## Run locally

1. Install Node.js 20.19 or newer and run `npm install`.
2. Run `npm start`.
3. Open `http://localhost:3000`.

The home page runs without MongoDB. Database features will require a
`MONGODB_URI` environment variable; `MONGODB_DB` can override the default
database name (`what_to_play`).

Game and music features are not implemented yet.
