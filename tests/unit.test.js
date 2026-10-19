import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { objectId, pageQuery, tags, text } from '../server/http.js';
import {
  hashPassword,
  checkPassword,
  tokenHash,
} from '../server/auth/security.js';

test('request validation rejects query objects and invalid pagination', () => {
  assert.throws(() => objectId('not-an-id'), { status: 400 });
  assert.throws(() => text({ $ne: '' }, 'Search'), { status: 400 });
  for (const query of [
    { page: -1 },
    { limit: 51 },
    { page: ['1', '2'] },
    { page: Number.MAX_SAFE_INTEGER },
  ])
    assert.throws(() => pageQuery(query), { status: 400 });
  assert.deepEqual(pageQuery({ page: '2', limit: '6' }), {
    page: 2,
    limit: 6,
    skip: 6,
  });
  assert.deepEqual(tags([' RPG ', 'rpg', '', 'Adventure']), [
    'rpg',
    'adventure',
  ]);
});

test('passwords are salted and checked without storing plaintext', async () => {
  const password = 'a-test-password-only';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.ok(!first.includes(password));
  assert.equal(await checkPassword(password, first), true);
  assert.equal(await checkPassword('incorrect-password', first), false);
  assert.equal(tokenHash('test-token').length, 64);
});

test('catalog snapshot has 1,500 distinct usable games', async () => {
  const games = JSON.parse(
    await readFile(new URL('../data/games.json', import.meta.url), 'utf8'),
  );
  assert.equal(games.length, 1500);
  assert.equal(new Set(games.map((game) => game.steamId)).size, games.length);
  for (const game of games) {
    assert.ok(game.title.trim() && Number.isSafeInteger(game.steamId));
    assert.ok(game.genres.length && game.tags.length);
    assert.ok(game.tags.every((tag) => tag === tag.trim().toLowerCase()));
    assert.equal(new URL(game.image).protocol, 'https:');
  }
});
