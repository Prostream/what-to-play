import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const sourceRevision = 'cafd8e20c265ed84f1e61f1c875327971f43a62f';
const sourceBase = `https://raw.githubusercontent.com/MTG/mtg-jamendo-dataset/${sourceRevision}/data`;
const outputFile = new URL('../data/music/songs.json', import.meta.url);
const targetCount = 1100;

async function fetchText(name) {
  const response = await fetch(`${sourceBase}/${name}`);
  if (!response.ok)
    throw new Error(`Could not download ${name}: HTTP ${response.status}`);
  return response.text();
}

function rows(content) {
  return content
    .split('\n')
    .slice(1)
    .map((line) => line.replace(/\r+$/, ''))
    .filter(Boolean)
    .map((line) => line.split('\t'));
}

function valuesWithPrefix(values, prefix) {
  return [
    ...new Set(
      values
        .filter((value) => value.startsWith(prefix))
        .map((value) => value.slice(prefix.length).trim().toLowerCase())
        .filter(Boolean),
    ),
  ].sort();
}

const [metadataText, annotationsText] = await Promise.all([
  fetchText('raw.meta.tsv'),
  fetchText('raw_30s_cleantags_50artists.tsv'),
]);

const metadata = new Map();
for (const columns of rows(metadataText)) {
  if (columns.length < 8) continue;
  const [sourceId, , , rawTitle, rawArtist] = columns;
  const title = rawTitle.trim();
  const artist = rawArtist.trim();
  if (sourceId && title && artist) metadata.set(sourceId, { title, artist });
}

const candidates = [];
for (const columns of rows(annotationsText)) {
  const [sourceId] = columns;
  const details = metadata.get(sourceId);
  if (!details) continue;

  const annotations = columns.slice(5);
  const genres = valuesWithPrefix(annotations, 'genre---');
  const moods = valuesWithPrefix(annotations, 'mood/theme---');
  if (genres.length === 0 || moods.length === 0) continue;

  const instruments = valuesWithPrefix(annotations, 'instrument---');
  const tags = [...new Set([...genres, ...moods, ...instruments])].sort();
  candidates.push({ sourceId, ...details, genres, moods, tags });
}

// Hash order samples across the full source instead of adjacent album tracks.
candidates.sort((a, b) => {
  const aHash = createHash('sha256').update(a.sourceId).digest('hex');
  const bHash = createHash('sha256').update(b.sourceId).digest('hex');
  return aHash.localeCompare(bHash);
});

const selected = [];
const seenSongs = new Set();
const artistCounts = new Map();
for (const song of candidates) {
  const songKey = `${song.artist.toLowerCase()}\0${song.title.toLowerCase()}`;
  const artistKey = song.artist.toLowerCase();
  if (seenSongs.has(songKey) || (artistCounts.get(artistKey) ?? 0) >= 3)
    continue;
  seenSongs.add(songKey);
  artistCounts.set(artistKey, (artistCounts.get(artistKey) ?? 0) + 1);
  selected.push(song);
  if (selected.length === targetCount) break;
}

if (selected.length !== targetCount) {
  throw new Error(`Expected ${targetCount} songs, found ${selected.length}`);
}

selected.sort(
  (a, b) =>
    a.title.localeCompare(b.title) || a.sourceId.localeCompare(b.sourceId),
);
await writeFile(outputFile, `${JSON.stringify(selected, null, 2)}\n`, 'utf8');
console.log(`Prepared ${selected.length} songs in ${outputFile.pathname}`);
