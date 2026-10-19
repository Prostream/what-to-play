# Games implementation

The Games owner requested accounts and game-based discovery after the original proposed team agreement. This addition applies to Games; Music remains a separate module. Shared account behavior for Music still needs coordination with its owner.

## Interface

`/games.html` follows the supplied sketch: top navigation for discovery, saved games and favorites; a central guided conversation; moving game covers behind it. Buttons handle choices; only game search and account/collection forms require typing. This uses Vanilla ES modules and CSS animation, without a chat model or Live2D runtime. Motion can be paused and respects reduced-motion preferences.

Visitors can browse, search, explore a genre, and get tag-based recommendations without signing in. Starting from a game preselects its tags; users keep preferred tags and optionally exclude others. Results rank by shared tag count, then title and ID. Excluded tags take precedence and the seed game is omitted. Genre exploration randomly samples matching games. YouTube options open external searches, not a live video feed.

## Accounts and saved games

- `POST /api/auth/register`, `/login`: email and password (8–128 characters).
- `GET /api/auth/me`: current account, or `null`; `POST /api/auth/logout`: end session.
- Passwords use salted scrypt; opaque session tokens use HttpOnly, SameSite cookies and Secure cookies in production. Only token hashes are stored. Sessions expire after seven days; sign-in attempts are limited per IP in MongoDB.
- `users`, `sessions`, `authAttempts` supplement `games` and `savedGames`. Every saved-game query includes the authenticated `userId`; unique `(userId, itemId)` replaces the original global `itemId` index. Legacy ownerless saves stay stored but are not assigned to an account.
- Saved CRUD keeps the original fields and adds boolean `favorite`. `GET /api/saved-games?favorite=true` returns only favorites. Ratings and personal tags do not alter catalog recommendations.
- This course demo has no email verification, password reset, account deletion, or email delivery.

## Additional game endpoints

`GET /api/games/filters` returns genres and common tags. `/api/games/recommendations` accepts `sourceId` and/or repeated `likedTag`, plus repeated `dislikedTag`. `/api/games/explore` accepts `genre`, `likedTag`, `dislikedTag` and `limit` (up to 50); each request is a fresh random batch, so page numbers do not advance through a stable list. Catalog search also accepts exact `tag` alongside `q` and `genre`.

## Run and verify

After `npm ci` and configuring `.env`, run `npm run db:seed:games`, then `npm run dev`. The server creates indexes at startup and requires Atlas connectivity. Imports are explicit, not run at every restart. Seed production separately before deploying this feature.

`npm test` runs local validation and password tests. `npm run test:integration` uses the configured Atlas connection with a new random `what_to_play_test_*` database, checks search, recommendation exclusions, authentication, private saved CRUD, expiry, and throttling, then removes that scratch database. It never uses the configured app database for test records. See [catalog source and import details](../data/README.md).
