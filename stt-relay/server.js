// Clara STT relay — standalone always-on process (Vercel can't hold persistent WebSockets).
// Relays browser audio to Deepgram's live API and streams transcripts back.
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); res.end('ok'); return; }
  res.writeHead(404); res.end();
});

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
      try { if (JSON.parse(data.toString()).type === 'close' && dgReady) dg.send(JSON.stringify({ type: 'CloseStream' })); } catch (e) {}
      return;
    }
    if (dgReady) dg.send(data);
    else queue.push(data);
  });
  client.on('close', () => { try { dg.close(); } catch (e) {} });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => console.log(`\n  Clara STT relay running → :${PORT}\n`));
