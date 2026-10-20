# Music API

Music uses a separate database through `MUSIC_MONGODB_URI` and `MUSIC_MONGODB_DB` (default `what_to_play_music`). Set both in `.env` locally and in the hosting service for deployment. Run `npm run db:seed:music` to import the catalog; see [source and license](../data/music/README.md).

- `GET /api/music`: title search `q`, exact `genre` and `mood`, plus `page` and `limit`.
- `GET /api/music/:id`: song details.
- `GET /api/music/discover`: five random songs, optionally filtered by exact `mood`; excludes blacklisted songs.
- `GET /api/music/recommendations`: repeated `likedTag` and `dislikedTag`; at least one liked tag. Dislikes take precedence, then results rank by matched tags, title, and ID.
- `GET`, `POST /api/saved-music`: list or create saved songs.
- `GET`, `PATCH`, `DELETE /api/saved-music/:id`: read, edit, or remove a saved record. Editable fields are `status`, `rating`, `personalTags`, and `notes`.
- `GET`, `POST /api/blacklisted-music`: list or blacklist songs. `POST` accepts `{ "itemId": "..." }`.
- `DELETE /api/blacklisted-music/:id`: remove a song from the blacklist; `:id` is the song ID.

Games and Music use the same `/api/auth` account and session cookie. Search and discovery remain public. Saved music and blacklist endpoints require sign-in, and records belong to the signed-in user. Each user may save or blacklist a song once; another user may make their own choice about that song. Lists default to 20 records and allow up to 50 per page.

`/music.html` opens Discover with Surprise me and mood choices, each returning up to five songs. Hovering or focusing a recommendation reveals Save and Blacklist; touch screens show the actions directly. Saved music includes a blacklisted-song list with removal. Blacklisting does not delete an existing saved record. Each user's blacklist is excluded from their own discovery and tag recommendations.

Old anonymous saved and blacklist records are preserved without an owner and are hidden from signed-in accounts. On the first authenticated Music write, the app creates per-user unique indexes and removes the old global `savedMusic.itemId` unique index. Moving anonymous records into an account requires a separate, explicit migration.

Both modules share the Express application in `server/app.js`; `server/index.js` initializes Games/account indexes and starts the server. Missing Music configuration produces an error from Music requests without changing Games routes.
