import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { getDb } from '../db.js';
import { fail } from '../http.js';
import { hashPassword, checkPassword, tokenHash } from './security.js';

export const authRouter = Router();
const cookieName = 'wtp_session';
const sessionDays = 7;
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};
const dummyHash = await hashPassword(randomBytes(32).toString('hex'));

function sessionToken(req) {
  const cookie = (req.headers.cookie || '')
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${cookieName}=`));
  return cookie?.slice(cookieName.length + 1) || '';
}

function credentials(body) {
  const { email, password } = body;
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    throw fail(400, 'VALIDATION_ERROR', 'Enter a valid email address.');
  }
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    password.length > 128
  ) {
    throw fail(
      400,
      'VALIDATION_ERROR',
      'Use a password between 8 and 128 characters.',
    );
  }
  return { email: email.trim().toLowerCase(), password };
}

// A shared database counter survives server restarts and covers all instances.
async function limitAttempts(req, _res, next) {
  const db = await getDb();
  const windowMs = 15 * 60 * 1000;
  const window = Math.floor(Date.now() / windowMs);
  const attempt = await db.collection('authAttempts').findOneAndUpdate(
    { _id: `${tokenHash(req.ip)}:${window}` },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date((window + 1) * windowMs) },
    },
    { upsert: true, returnDocument: 'after' },
  );
  if (attempt.count > 20)
    throw fail(
      429,
      'RATE_LIMITED',
      'Too many attempts. Please try again in 15 minutes.',
    );
  next();
}

async function startSession(req, res, user) {
  const db = await getDb();
  const oldToken = sessionToken(req);
  if (oldToken)
    await db.collection('sessions').deleteOne({ _id: tokenHash(oldToken) });
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + sessionDays * 86400000);
  await db
    .collection('sessions')
    .insertOne({ _id: tokenHash(token), userId: user._id, expiresAt });
  res.cookie(cookieName, token, { ...cookieOptions, expires: expiresAt });
  return { id: user._id.toString(), email: user.email };
}

export async function currentUser(req) {
  const token = sessionToken(req);
  if (!token) return null;
  const db = await getDb();
  const session = await db
    .collection('sessions')
    .findOne({ _id: tokenHash(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await db
    .collection('users')
    .findOne({ _id: session.userId }, { projection: { email: 1 } });
  return user ? { id: user._id.toString(), email: user.email } : null;
}

export async function requireUser(req, _res, next) {
  req.user = await currentUser(req);
  if (!req.user)
    throw fail(
      401,
      'UNAUTHORIZED',
      'Sign in to view and save your collection.',
    );
  next();
}

authRouter.get('/me', async (req, res) =>
  res.json({ data: await currentUser(req) }),
);

authRouter.post('/register', limitAttempts, async (req, res) => {
  const { email, password } = credentials(req.body);
  const db = await getDb();
  const user = {
    email,
    passwordHash: await hashPassword(password),
    createdAt: new Date(),
  };
  try {
    await db.collection('users').insertOne(user);
  } catch (error) {
    if (error.code === 11000)
      throw fail(
        409,
        'EMAIL_IN_USE',
        'An account with this email already exists.',
      );
    throw error;
  }
  res.status(201).json({ data: await startSession(req, res, user) });
});

authRouter.post('/login', limitAttempts, async (req, res) => {
  const { email, password } = credentials(req.body);
  const db = await getDb();
  const user = await db.collection('users').findOne({ email });
  const valid = await checkPassword(password, user?.passwordHash || dummyHash);
  if (!user || !valid)
    throw fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  res.json({ data: await startSession(req, res, user) });
});

authRouter.post('/logout', async (req, res) => {
  const db = await getDb();
  await db
    .collection('sessions')
    .deleteOne({ _id: tokenHash(sessionToken(req)) });
  res.clearCookie(cookieName, cookieOptions);
  res.json({ data: { signedOut: true } });
});
