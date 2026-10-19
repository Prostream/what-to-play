import express from 'express';
import { fileURLToPath } from 'node:url';
import { musicRouter } from './music.js';
import { savedMusicRouter } from './saved-music.js';

const app = express();
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

app.use(express.json());
app.use((error, req, res, next) => {
  if (req.path.startsWith('/api/') && error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid JSON request body.',
      },
    });
  }
  return next(error);
});
app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
});
app.use('/api/music', musicRouter);
app.use('/api/saved-music', savedMusicRouter);
app.use(express.static(publicDir));

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`What to Play is running at http://localhost:${port}`);
});
