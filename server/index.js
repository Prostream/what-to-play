import express from 'express';
import { fileURLToPath } from 'node:url';
import { musicRouter } from './music.js';

const app = express();
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

app.use(express.json());
app.use('/api/music', musicRouter);
app.use(express.static(publicDir));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`What to Play is running at http://localhost:${port}`);
});
