# Music catalog data

`songs.json` contains a deterministic sample of 1,100 song metadata records from the [MTG-Jamendo Dataset](https://github.com/MTG/mtg-jamendo-dataset), revision `cafd8e20c265ed84f1e61f1c875327971f43a62f`. It includes no audio. The source metadata is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) and is provided by the Music Technology Group, copyright 2019–2023. This transformed metadata subset follows the same license; it is separate from the project's application code license. Use it only within the source's non-commercial research and academic terms.

The preparation script joins `data/raw.meta.tsv` with `data/raw_30s_cleantags_50artists.tsv` by track ID, keeps records with a title, artist, genre, and mood, and turns source genre, mood/theme, and instrument annotations into searchable tags. It chooses 1,100 records by a stable hash of the source track ID, skipping duplicate artist/title pairs and limiting each artist to three songs. `sourceId` preserves the upstream track ID for attribution and repeatable imports.

To recreate `songs.json` from the pinned upstream revision:

```sh
node scripts/prepare-music-data.js
```

To import into MongoDB, set `MUSIC_MONGODB_URI` in your environment. `MUSIC_MONGODB_DB` is optional and defaults to `what_to_play_music`. If these values are in an ignored local `.env` file, run:

```sh
node --env-file=.env scripts/import-music.js
```

If your deployment provides environment variables directly, run `node scripts/import-music.js` instead. Never commit `.env` or include the connection URI in project documentation.

The import creates a unique index on `sourceId` and updates records in place, so rerunning it does not create duplicates or change existing MongoDB IDs. It does not delete other catalog records. This Music database contains over 1,000 imported songs on its own, so the count does not depend on combining it with a separate Games database.
