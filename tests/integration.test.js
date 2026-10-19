import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { getDb, closeDb } from '../server/db.js';
import { ensureIndexes } from '../server/indexes.js';

// Every run owns a new scratch database; never use the configured app database.
const databaseName = `what_to_play_test_${randomBytes(8).toString('hex')}`;
process.env.MONGODB_DB = databaseName;
process.env.NODE_ENV = 'test';
let db, server, base, games, alice, bob, savedId;
const password = randomBytes(16).toString('hex');

async function call(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(method !== 'GET' ? { body: JSON.stringify(body || {}) } : {}),
  });
  return {
    status: response.status,
    cookie: response.headers.get('set-cookie')?.split(';')[0],
    setCookie: response.headers.get('set-cookie'),
    json: await response.json(),
  };
}

before(async () => {
  assert.ok(
    process.env.MONGODB_URI,
    'Set MONGODB_URI to run integration tests.',
  );
  db = await getDb();
  await db
    .collection('savedGames')
    .createIndex({ itemId: 1 }, { unique: true });
  await ensureIndexes(db);
  await db.collection('games').insertMany([
    {
      title: 'Original',
      steamId: 1,
      genres: ['rpg'],
      tags: ['story', 'co-op'],
      image: '',
    },
    {
      title: 'Both tags',
      steamId: 2,
      genres: ['rpg'],
      tags: ['story', 'co-op'],
      image: '',
    },
    {
      title: 'Quiet story',
      steamId: 3,
      genres: ['rpg'],
      tags: ['story'],
      image: '',
    },
    {
      title: 'Different [game]',
      steamId: 4,
      genres: ['racing'],
      tags: ['fast'],
      image: '',
    },
  ]);
  games = await db.collection('games').find().sort({ steamId: 1 }).toArray();
  const { app } = await import('../server/app.js');
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (
    db &&
    db.databaseName === databaseName &&
    /^what_to_play_test_[a-f0-9]{16}$/.test(databaseName)
  )
    await db.dropDatabase();
  await closeDb();
});

test('catalog search escapes regex and validates IDs and page bounds', async () => {
  const response = await call('/games?q=%5Bgame%5D');
  assert.equal(response.status, 200);
  assert.deepEqual(
    response.json.data.map((game) => game.title),
    ['Different [game]'],
  );
  assert.equal((await call('/games?limit=51')).status, 400);
  assert.equal((await call('/games/not-valid')).status, 400);
  assert.equal((await call('/games?page=99')).json.data.length, 0);
});

test('write endpoints reject invalid bodies at the API boundary', async () => {
  for (const path of ['/auth/register', '/auth/login', '/saved-games']) {
    const result = await call(path, { method: 'POST', body: [] });
    assert.equal(result.status, 400);
    assert.equal(result.json.error.message, 'Provide a JSON object.');
  }
  const response = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.message, 'Invalid JSON body.');
});

test('recommendations rank shared tags, exclude the seed and honor dislikes', async () => {
  const path = `/games/recommendations?sourceId=${games[0]._id}`;
  const result = await call(path);
  assert.deepEqual(
    result.json.data.map((game) => game.title),
    ['Both tags', 'Quiet story'],
  );
  assert.deepEqual(
    result.json.data.map((game) => game.score),
    [2, 1],
  );
  const exclude = await call(`${path}&dislikedTag=co-op`);
  assert.deepEqual(
    exclude.json.data.map((game) => game.title),
    ['Quiet story'],
  );
  assert.equal(
    (await call(`${path}&dislikedTag=story&dislikedTag=co-op`)).json.data
      .length,
    0,
  );
  assert.equal((await call('/games/recommendations')).status, 400);
  assert.equal((await call(`${path}&tag=fast`)).json.data.length, 0);
  assert.equal(
    (await call('/games/explore?tag=fast&likedTag=story')).json.data.length,
    0,
  );
  const explore = await call('/games/explore?genre=rpg&dislikedTag=co-op');
  assert.deepEqual(
    explore.json.data.map((game) => game.title),
    ['Quiet story'],
  );
});

test('registration creates safe sessions and normalizes email', async () => {
  assert.equal((await call('/saved-games')).status, 401);
  const result = await call('/auth/register', {
    method: 'POST',
    body: { email: 'ALICE@example.test', password },
  });
  assert.equal(result.status, 201);
  assert.equal(result.json.data.email, 'alice@example.test');
  assert.deepEqual(Object.keys(result.json.data).sort(), ['email', 'id']);
  assert.match(result.setCookie, /HttpOnly/i);
  assert.match(result.setCookie, /SameSite=Lax/i);
  alice = result.cookie;
  assert.equal(
    (await call('/auth/me', { cookie: alice })).json.data.email,
    'alice@example.test',
  );
  const stored = await db
    .collection('users')
    .findOne({ email: 'alice@example.test' });
  assert.notEqual(stored.passwordHash, password);
  const token = alice.split('=')[1];
  assert.equal(
    await db.collection('sessions').countDocuments({ _id: token }),
    0,
  );
  assert.equal(
    (
      await call('/auth/register', {
        method: 'POST',
        body: { email: 'alice@example.test', password },
      })
    ).status,
    409,
  );
  bob = (
    await call('/auth/register', {
      method: 'POST',
      body: { email: 'bob@example.test', password },
    })
  ).cookie;
});

test('saved CRUD is private and each user can save the same game once', async () => {
  const body = { itemId: games[0]._id.toString() };
  const created = await call('/saved-games', {
    method: 'POST',
    cookie: alice,
    body,
  });
  assert.equal(created.status, 201);
  savedId = created.json.data.id;
  assert.equal(created.json.data.item.title, 'Original');
  assert.equal(
    (await call('/saved-games', { method: 'POST', cookie: alice, body }))
      .status,
    409,
  );
  assert.equal(
    (await call('/saved-games', { method: 'POST', cookie: bob, body })).status,
    201,
  );
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    assert.equal(
      (
        await call(`/saved-games/${savedId}`, {
          method,
          cookie: bob,
          body: { notes: 'not yours' },
        })
      ).status,
      404,
    );
  }
  const updated = await call(`/saved-games/${savedId}`, {
    method: 'PATCH',
    cookie: alice,
    body: {
      favorite: true,
      rating: 5,
      notes: '<script>not HTML</script>',
      personalTags: [' Weekend '],
      status: 'completed',
    },
  });
  assert.equal(updated.json.data.favorite, true);
  assert.deepEqual(updated.json.data.personalTags, ['weekend']);
  assert.equal(
    (await call('/saved-games?favorite=true', { cookie: alice })).json
      .pagination.total,
    1,
  );
  assert.equal(
    (await call('/saved-games?favorite=true', { cookie: bob })).json.pagination
      .total,
    0,
  );
  assert.equal(
    (
      await call(`/saved-games/${savedId}`, {
        method: 'PATCH',
        cookie: alice,
        body: { userId: 'other' },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(`/saved-games/${savedId}`, {
        method: 'PATCH',
        cookie: alice,
        body: { rating: 6 },
      })
    ).status,
    400,
  );
  assert.equal(
    (await call(`/saved-games/${savedId}`, { method: 'DELETE', cookie: alice }))
      .status,
    200,
  );
  assert.equal(
    (await call(`/saved-games/${savedId}`, { cookie: alice })).status,
    404,
  );
});

test('cross-origin writes are blocked; logout and expiry invalidate sessions', async () => {
  assert.equal(
    (
      await call('/auth/logout', {
        method: 'POST',
        cookie: alice,
        headers: { Origin: 'https://another.example' },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call('/auth/logout', {
        method: 'POST',
        cookie: alice,
        headers: { 'Content-Type': 'text/plain' },
      })
    ).status,
    415,
  );
  assert.equal(
    (await call('/auth/logout', { method: 'POST', cookie: alice })).status,
    200,
  );
  assert.equal((await call('/auth/me', { cookie: alice })).json.data, null);
  assert.equal(
    (
      await call('/auth/login', {
        method: 'POST',
        body: { email: 'alice@example.test', password: 'wrong-password' },
      })
    ).status,
    401,
  );
  const login = await call('/auth/login', {
    method: 'POST',
    body: { email: 'alice@example.test', password },
  });
  assert.equal(login.status, 200);
  assert.notEqual(login.cookie, alice);
  await db
    .collection('sessions')
    .updateMany({}, { $set: { expiresAt: new Date(0) } });
  assert.equal(
    (await call('/saved-games', { cookie: login.cookie })).status,
    401,
  );
});

test('login attempts are bounded by the shared rate limit', async () => {
  await db.collection('authAttempts').updateMany({}, { $set: { count: 20 } });
  assert.equal(
    (
      await call('/auth/login', {
        method: 'POST',
        body: { email: 'alice@example.test', password },
      })
    ).status,
    429,
  );
});
