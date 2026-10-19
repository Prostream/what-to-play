import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(
  password,
  salt = randomBytes(16).toString('hex'),
) {
  const key = await deriveKey(password, salt, 64, options);
  return `${salt}:${key.toString('hex')}`;
}

export async function checkPassword(password, stored) {
  const [salt, expected] = stored.split(':');
  const actual = await deriveKey(password, salt, 64, options);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}

export function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}
