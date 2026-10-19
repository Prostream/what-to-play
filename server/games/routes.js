import { Router } from 'express';
import { requireUser } from '../auth/routes.js';
import {
  catalog,
  explore,
  filters,
  getGame,
  recommendations,
} from './catalog.js';
import {
  savedList,
  savedItem,
  saveGame,
  updateSaved,
  deleteSaved,
} from './saved.js';

export const gamesRouter = Router();
gamesRouter.get('/', async (req, res) => res.json(await catalog(req.query)));
gamesRouter.get('/filters', async (_req, res) =>
  res.json({ data: await filters() }),
);
gamesRouter.get('/recommendations', async (req, res) =>
  res.json(await recommendations(req.query)),
);
gamesRouter.get('/explore', async (req, res) =>
  res.json(await explore(req.query)),
);
gamesRouter.get('/:id', async (req, res) =>
  res.json({ data: await getGame(req.params.id) }),
);

export const savedGamesRouter = Router();
savedGamesRouter.use(requireUser);
savedGamesRouter.get('/', async (req, res) =>
  res.json(await savedList(req.user.id, req.query)),
);
savedGamesRouter.get('/:id', async (req, res) =>
  res.json({ data: await savedItem(req.user.id, req.params.id) }),
);
savedGamesRouter.post('/', async (req, res) =>
  res.status(201).json({ data: await saveGame(req.user.id, req.body) }),
);
savedGamesRouter.patch('/:id', async (req, res) =>
  res.json({ data: await updateSaved(req.user.id, req.params.id, req.body) }),
);
savedGamesRouter.delete('/:id', async (req, res) =>
  res.json({ data: await deleteSaved(req.user.id, req.params.id) }),
);
