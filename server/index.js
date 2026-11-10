// FitTrack API: one POST /api endpoint backed by MongoDB Atlas.
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { store } from './http.js';
import { dispatchBatch } from './api.server.js';

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '6mb' }));
app.use(cookieParser());

app.post('/api', (req, res) => {
  const calls = Array.isArray(req.body?.calls) ? req.body.calls.slice(0, 40) : [];
  if (!calls.length) return res.status(400).json({ error: 'No calls' });
  store.run({ req, res }, async () => {
    res.json(await dispatchBatch(calls.map((c) => ({ action: String(c.action), args: c.args ?? {} })), req.body.origin));
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`FitTrack API on http://localhost:${port}`));
