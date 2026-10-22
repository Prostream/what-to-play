import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const source =
  'https://media.githubusercontent.com/media/vintagedon/steam-dataset-2025/4a8b5703ca837ba8023621f8018d9fdf18598373/data/01_raw/steam_2025_5k-dataset-games_20250831.json.gz';
const checksum =
  '3b46222510ad64b87e8a0c63c92dba8f5788e0b8abdd4a1f3471ca0d7a70f2af';
const genreNames = new Map([
  ['1', 'action'],
  ['2', 'strategy'],
  ['3', 'rpg'],
  ['4', 'casual'],
  ['9', 'racing'],
  ['18', 'sports'],
  ['23', 'indie'],
  ['25', 'adventure'],
  ['28', 'simulation'],
  ['29', 'massively multiplayer'],
  ['37', 'free to play'],
  ['70', 'early access'],
]); // curious if theres any significance to these genre numbers
const excludedGenres = new Set([
  '51',
  '52',
  '53',
  '54',
  '55',
  '56',
  '57',
  '58',
  '59',
  '60',
  '71',
  '72',
  '80',
]);
const categoryTags = new Map([
  [1, 'multiplayer'],
  [2, 'single-player'],
  [9, 'co-op'],
  [20, 'mmo'],
  [24, 'split screen'],
  [27, 'cross-platform multiplayer'],
  [36, 'online pvp'],
  [37, 'local pvp'],
  [38, 'online co-op'],
  [39, 'local co-op'],
  [49, 'pvp'],
]);
const normalize = (values) => [
  ...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)),
];

const response = process.argv[2]
  ? null
  : await fetch(source, { signal: AbortSignal.timeout(120000) });
if (response && !response.ok)
  throw new Error(`Dataset download failed (${response.status}).`);
const compressed = process.argv[2]
  ? await readFile(process.argv[2])
  : Buffer.from(await response.arrayBuffer());
if (createHash('sha256').update(compressed).digest('hex') !== checksum)
  throw new Error(
    'Dataset checksum changed. Review the new source before importing.',
  );
const { games: rows } = JSON.parse(gunzipSync(compressed));
const eligible = rows
  .map((row) => row.app_details.data)
  .filter(
    (game) =>
      game?.type === 'game' &&
      game.name?.trim() &&
      game.genres?.length &&
      game.genres.some((genre) => genreNames.has(genre.id)) &&
      !game.genres.some((genre) => excludedGenres.has(genre.id)) &&
      !game.release_date?.coming_soon &&
      !game.content_descriptors?.ids.some((id) => [3, 4].includes(id)) &&
      Number.isSafeInteger(game.steam_appid) &&
      /^https:\/\//.test(game.header_image),
  );
eligible.sort(
  (a, b) =>
    (b.recommendations?.total || 0) - (a.recommendations?.total || 0) ||
    a.steam_appid - b.steam_appid,
);
const games = [
  ...new Map(eligible.map((game) => [game.steam_appid, game])).values(),
]
  .slice(0, 1500)
  .map((game) => {
    const genres = normalize(
      game.genres.map((genre) => genreNames.get(genre.id)).filter(Boolean),
    );
    const gameplay = (game.categories || [])
      .map((category) => categoryTags.get(category.id))
      .filter(Boolean);
    return {
      steamId: game.steam_appid,
      title: game.name.trim(),
      genres,
      tags: normalize([...genres, ...gameplay]),
      image: game.header_image,
      releaseDate: game.release_date.date,
      source: 'steam-dataset-2025',
    };
  });
if (games.length !== 1500)
  throw new Error(`Expected 1,500 valid games; found ${games.length}.`);
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../data/games.json', import.meta.url),
  `${JSON.stringify(games, null, 2)}\n`,
);
console.log(`Prepared ${games.length} real games from the August 2025 sample.`);
