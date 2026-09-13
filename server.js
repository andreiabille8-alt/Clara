// Clara — tiny server. Serves the app and keeps your Anthropic key off the browser.
const express = require('express');
const path = require('path');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function validKey(k) {
  // Legacy echo: storage prefix is intentionally unchanged so existing data remains reachable.
  return typeof k === 'string' && /^echo:[a-z]+$/.test(k);
}

function supabaseHeaders(extra) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

app.get('/api/store', async (req, res) => {
  const key = req.query.key;
  if (!validKey(key)) return res.status(400).json({ error: 'Invalid key' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY — copy .env.example to .env and add them.' });
  }
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}&select=value`,
      { headers: supabaseHeaders() }
    );
    if (!r.ok) return res.status(502).json({ error: await r.text() });
    const rows = await r.json();
    res.json({ value: rows[0]?.value ?? null });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.put('/api/store', async (req, res) => {
  const { key, value } = req.body || {};
  if (!validKey(key)) return res.status(400).json({ error: 'Invalid key' });
  if (typeof value !== 'string') return res.status(400).json({ error: 'Value must be a string' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY — copy .env.example to .env and add them.' });
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/kv_store?on_conflict=key`, {
      method: 'POST',
      headers: supabaseHeaders({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify([{ key, value }]),
    });
    if (!r.ok) return res.status(502).json({ error: await r.text() });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Proxy the browser's Claude calls through here so the key stays server-side.
app.post('/api/chat', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY — copy .env.example to .env and add your key.' });
  }
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Tell the browser whether streaming STT is available so it can pick its engine.
app.get('/api/stt-status', (req, res) => {
  res.json({ available: !!process.env.DEEPGRAM_API_KEY });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`\n  Clara is running → http://localhost:${PORT}\n`));

// Streaming transcription relay: browser audio ⇄ Deepgram live API (key stays server-side).
const wss = new WebSocket.Server({ server, path: '/api/stt' });
wss.on('connection', (client) => {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    try { client.send(JSON.stringify({ type: 'error', error: 'no_key' })); } catch (e) {}
    client.close();
    return;
  }
  const dgUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true&punctuate=true&language=en';
  const dg = new WebSocket(dgUrl, { headers: { Authorization: 'Token ' + key } });
  let dgReady = false;
  const queue = [];

  dg.on('open', () => {
    dgReady = true;
    while (queue.length) dg.send(queue.shift());
    try { client.send(JSON.stringify({ type: 'ready' })); } catch (e) {}
  });
  dg.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const alt = msg.channel && msg.channel.alternatives && msg.channel.alternatives[0];
      if (alt && typeof alt.transcript === 'string') {
        client.send(JSON.stringify({ type: 'transcript', text: alt.transcript, final: !!msg.is_final }));
      }
    } catch (e) {}
  });
  dg.on('error', () => { try { client.send(JSON.stringify({ type: 'error', error: 'deepgram' })); } catch (e) {} });
  dg.on('close', () => { try { client.close(); } catch (e) {} });

  client.on('message', (data, isBinary) => {
    if (!isBinary) {
      // control messages from the browser (e.g. {type:'close'})
      try { if (JSON.parse(data.toString()).type === 'close' && dgReady) dg.send(JSON.stringify({ type: 'CloseStream' })); } catch (e) {}
      return;
    }
    if (dgReady) dg.send(data);
    else queue.push(data);
  });
  client.on('close', () => { try { dg.close(); } catch (e) {} });
});
