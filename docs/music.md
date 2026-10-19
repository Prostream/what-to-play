# Music API

Music uses a separate database through `MUSIC_MONGODB_URI` and `MUSIC_MONGODB_DB` (default `what_to_play_music`). Set both in `.env` locally and in the hosting service for deployment. Run `npm run db:seed:music` to import the catalog; see [source and license](../data/music/README.md).

- `GET /api/music`: title search `q`, exact `genre` and `mood`, plus `page` and `limit`.
- `GET /api/music/:id`: song details.
- `GET /api/music/recommendations`: repeated `likedTag` and `dislikedTag`; at least one liked tag. Dislikes take precedence, then results rank by matched tags, title, and ID.
- `GET`, `POST /api/saved-music`: list or create saved songs.
- `GET`, `PATCH`, `DELETE /api/saved-music/:id`: read, edit, or remove a saved record. Editable fields are `status`, `rating`, `personalTags`, and `notes`.

Music keeps the original shared, single-user saved-song behavior. Games authentication does not apply to Music endpoints. A saved song is unique by `itemId`; the list includes its title and artist. Lists default to 20 records and allow up to 50 per page.

The Music page remains to be implemented. Both modules share the Express application in `server/app.js`; `server/index.js` initializes Games/account indexes and starts the server. Missing Music configuration produces an error from Music requests without changing Games routes.
