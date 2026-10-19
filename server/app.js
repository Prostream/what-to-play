import express from 'express';
import { fileURLToPath } from 'node:url';
import { authRouter } from './auth/routes.js';
import { gamesRouter, savedGamesRouter } from './games/routes.js';
import { errorHandler, jsonWrites } from './http.js';

export const app = express();
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', jsonWrites);
app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok' } }));
app.use('/api/auth', authRouter);
app.use('/api/games', gamesRouter);
app.use('/api/saved-games', savedGamesRouter);
app.use('/api', (_req, res) =>
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'API route was not found.' },
  }),
);
app.use(express.static(fileURLToPath(new URL('../public/', import.meta.url))));
app.use(errorHandler);
