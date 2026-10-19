import express from 'express';
import { fileURLToPath } from 'node:url';

const app = express();
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

app.use(express.json());
app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
});
app.use(express.static(publicDir));

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`What to Play is running at http://localhost:${port}`);
});
