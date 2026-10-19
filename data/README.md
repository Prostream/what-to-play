# Games catalog

Source: Donald Fountain (VintageDon), [Steam Dataset 2025](https://github.com/vintagedon/steam-dataset-2025), August 31, 2025 sample.
Dataset license: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Downloaded October 19, 2026. The dataset license is separate from this project's MIT code license; game artwork remains the property of its respective owners.

`games.json` contains 1,500 games selected from the source's 5,000-game sample, ordered by its recommendation counts. We retain released games with names, game genres, and HTTPS cover images; exclude demos, DLC, software, movies, and entries marked with sexual content or nudity. This is a historical subset, not a complete or live Steam catalog.

Changes: keep only ID, title, genres, image URL, release date, and source name. Map genre IDs to English labels and derive recommendation tags from genres plus gameplay categories (single-player, multiplayer, co-op, PvP, etc.). These are metadata tags, not Steam community tags. Images load from the original Steam URLs; image files are not redistributed here.

Run `npm run data:games` to reproduce the snapshot. The script verifies the original compressed file's SHA-256 before processing it. Run `npm run db:seed:games` to upsert into the database configured in `.env`. Repeating the import preserves game IDs and saved records; it does not delete catalog entries.
