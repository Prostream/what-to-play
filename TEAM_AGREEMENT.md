# What to Play: Team Agreement

**Status:** Proposed for Chunzhang and Joshua to confirm before feature work. This document records the intended MVP contract; update it together if either module needs a different shared rule.

## Scope and ownership

- Chunzhang owns Games: its page, client modules, Express routes, MongoDB queries, catalog import, and `savedGames` CRUD.
- Ziyong (Joshua) owns Music: its page, client modules, Express routes, MongoDB queries, catalog import, and `savedMusic` CRUD. Joshua develops on the `Joshua` branch.
- This is a single-user course demo. There are no accounts, authentication, or user IDs in the MVP.
- The phrase “from the ones you already like” describes the project goal. MVP recommendations use tags selected by the visitor; selecting a particular liked song or game and computing item similarity is outside the agreed MVP.
- Catalogs are pre-imported into MongoDB. Live third-party API calls are outside the MVP. Use Node.js ES modules, Express, the native MongoDB driver, and client-side Vanilla JavaScript; do not use Mongoose or a template engine.

## Collections and ownership boundaries

| Collection | Owner | Purpose |
| --- | --- | --- |
| `songs` | Music | Searchable song catalog |
| `savedMusic` | Music | Visitor's saved songs; full CRUD |
| `games` | Games | Searchable game catalog |
| `savedGames` | Games | Visitor's saved games; full CRUD |

Each owner keeps module-specific server code, client JavaScript, and CSS separate. Coordinate changes to shared files such as `server/index.js`, the home navigation, `README.md`, and the design document. The two owners jointly verify that the imported database contains more than 1,000 valid records; the split between catalogs depends on the available data sources.

## Data contract

Catalog records share these fields:

| Field | Type | Rule |
| --- | --- | --- |
| `_id` | MongoDB `ObjectId` | Exposed as string `id` in API responses |
| `title` | string | Required; trimmed |
| `genres` | string[] | May be empty; normalized, unique values |
| `tags` | string[] | May be empty; normalized, unique values; used for recommendations |

`songs` also has required `artist` (string) and `moods` (string array, possibly empty). Games may add game-specific fields without changing the shared fields. Store `genres`, `moods`, and `tags` in lowercase with surrounding whitespace removed. Keep data-source name, license/usage terms, download date, and import steps in the module documentation or import script. Make imports repeatable and avoid duplicate catalog records.

Saved records in both `savedMusic` and `savedGames` share:

| Field | Type | Rule |
| --- | --- | --- |
| `_id` | MongoDB `ObjectId` | Saved-record ID; exposed as string `id` |
| `itemId` | MongoDB `ObjectId` | References `songs._id` or `games._id`; exposed as string |
| `status` | string | `planned` or `completed`; defaults to `planned` |
| `rating` | integer or null | `null` or an integer from 1 through 5; defaults to `null` |
| `personalTags` | string[] | Visitor's own normalized, unique tags; defaults to `[]` |
| `notes` | string | Defaults to an empty string |
| `createdAt`, `updatedAt` | MongoDB Date | Returned as ISO 8601 strings |

The UI labels `planned`/`completed` as “Want to listen”/“Listened” for Music and “Want to play”/“Played” for Games. A catalog item can appear at most once in its saved collection; enforce this with a unique index on `itemId`. Catalog `tags` describe the item; `personalTags` belong to the saved record and do not affect catalog recommendations.

## API routes

| Operation | Music | Games |
| --- | --- | --- |
| Catalog list/search | `GET /api/music` | `GET /api/games` |
| Recommendations | `GET /api/music/recommendations` | `GET /api/games/recommendations` |
| Catalog item | `GET /api/music/:id` | `GET /api/games/:id` |
| Saved list/create | `GET`, `POST /api/saved-music` | `GET`, `POST /api/saved-games` |
| Saved item/update/delete | `GET`, `PATCH`, `DELETE /api/saved-music/:id` | `GET`, `PATCH`, `DELETE /api/saved-games/:id` |

In a saved route, `:id` identifies the saved record; `itemId` identifies the referenced catalog item. `POST` accepts `itemId` and optional `status`, `rating`, `personalTags`, and `notes`. `PATCH` accepts only the editable fields: `status`, `rating`, `personalTags`, and `notes`. The server sets IDs and timestamps. Reject unknown `itemId` values and invalid request fields. Saved-list responses include an `item` summary with at least catalog `id` and `title`, so the list can render without one request per saved record; Music also includes `artist`.

## Queries and recommendations

- All list routes accept `page` and `limit`; defaults are `page=1`, `limit=20`, and maximum `limit=50`. Values must be positive integers. A page beyond the end returns an empty `data` array.
- `GET /api/music` accepts `q` (case-insensitive title substring), `genre`, and `mood`. Provided filters are combined with AND. Genre and mood match a normalized array value exactly. Games can share `q` and `genre` and add module-specific filters.
- Recommendation routes accept repeated `likedTag` and `dislikedTag` query parameters, for example `?likedTag=chill&likedTag=acoustic&dislikedTag=loud`. At least one `likedTag` is required. Normalize and deduplicate the supplied values.
- Exclude catalog items containing any disliked tag. Include only items matching at least one liked tag. Sort by the number of liked tags matched, descending; break ties by title, then catalog ID for stable pagination. If the same tag is both liked and disliked, the disliked tag takes precedence. No saved-item or rating-based recommendation logic is required.
- Default catalog and saved-list ordering is title ascending, then ID ascending. The saved list orders by its referenced item's title.

## HTTP and JSON response contract

Successful lists return:

```json
{
  "data": [{ "id": "..." }],
  "pagination": { "page": 1, "limit": 20, "total": 125, "totalPages": 7 }
}
```

`total` is the count after filtering and before pagination; `totalPages` is `0` when `total` is `0`. A single read, create, or update returns `{ "data": { ... } }`. A delete returns `{ "data": { "id": "...", "deleted": true } }`. JSON uses string IDs and ISO 8601 date strings; MongoDB `_id` and BSON types do not appear in responses.

Errors return `{ "error": { "code": "VALIDATION_ERROR", "message": "Readable explanation" } }`. Use HTTP 200 for successful reads, updates, and deletes; 201 for creates; 400/`VALIDATION_ERROR` for invalid IDs, query parameters, or body fields; 404/`NOT_FOUND` for missing records; 409/`ALREADY_SAVED` for a duplicate saved item; and 500/`INTERNAL_ERROR` for unexpected failures. Do not expose credentials, connection strings, or stack traces in API errors.

## Shared front-end style

- Use a simple, responsive dark theme: background `#0F172A`, cards `#1E293B`, primary text `#F8FAFC`, primary accent `#22D3EE`, and secondary accent `#A78BFA`. Check text and control contrast in the final pages.
- Share the same header/navigation pattern, search and filter area, result cards, saved-item form, loading state, empty state, and error state. Use a single column on narrow screens.
- Use semantic HTML forms, labels, buttons, and headings. Render content with Vanilla JavaScript ES modules and Fetch API. Display API validation messages near the relevant form; do not inject catalog text as HTML.

## Integration and delivery checks

1. Confirm this contract and the Music/Games ownership with both teammates before implementation.
2. Agree on real catalog sources and repeatable imports; count valid records in MongoDB after import.
3. Implement each module behind its own route prefix and files, then integrate shared navigation and Express route mounting.
4. Cross-test the other person's search, recommendation, all four saved-item CRUD actions, empty results, invalid input, and responsive page.
5. Verify the rubric together: design document and sketches, usage instructions, native-driver MongoDB, ES modules, forms and client rendering, ESLint, Prettier, README, MIT license, deployment, code review, video, and submission links. Keep MongoDB credentials only in ignored environment files or deployment secrets.
