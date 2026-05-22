const http = require('http');
const https = require('https');
const fs   = require('fs');
const path = require('path');

const PORT = 3000;

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };

http.createServer((req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── AI proxy ──────────────────────────────────────────────────────────────
  // Accepts { aiUrl, aiModel, aiKey, system, messages } from the client.
  // Translates to an OpenAI-compatible chat completion request, then
  // translates the response back to the Anthropic format the HTML expects.
  if (req.method === 'POST' && req.url === '/proxy/ai') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      let payload;
      try { payload = JSON.parse(body); }
      catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid JSON from client' } }));
        return;
      }

      const { aiUrl, aiModel, aiKey, system, messages } = payload;

      if (!aiUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'aiUrl is required in request body' } }));
        return;
      }

      const ollamaBody = Buffer.from(JSON.stringify({
        model: aiModel || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system || '' },
          ...(messages || [])
        ],
        stream: false,
        temperature: 0.1
      }));

      // Parse the target URL to decide http vs https
      let targetUrl;
      try { targetUrl = new URL(aiUrl); }
      catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: `Invalid aiUrl: ${aiUrl}` } }));
        return;
      }

      const isHttps  = targetUrl.protocol === 'https:';
      const lib      = isHttps ? https : http;
      const port     = targetUrl.port ? parseInt(targetUrl.port) : (isHttps ? 443 : 80);
      const headers  = {
        'Content-Type':   'application/json',
        'Content-Length': ollamaBody.length
      };
      if (aiKey) headers['Authorization'] = `Bearer ${aiKey}`;

      const upstream = lib.request({
        hostname: targetUrl.hostname,
        port,
        path:   targetUrl.pathname + (targetUrl.search || ''),
        method: 'POST',
        headers
      }, upRes => {
        let respBody = '';
        upRes.on('data', chunk => respBody += chunk.toString());
        upRes.on('end', () => {
          try {
            const parsed = JSON.parse(respBody);
            if (upRes.statusCode !== 200) {
              // OpenAI errors are nested: { error: { message, type, code } }
              // Other APIs may return { error: "string" } or plain text
              let errMsg;
              if (parsed.error?.message)       errMsg = parsed.error.message;
              else if (typeof parsed.error === 'string') errMsg = parsed.error;
              else                             errMsg = respBody;
              res.writeHead(upRes.statusCode, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: { message: errMsg } }));
              return;
            }

            // Strip <think>...</think> blocks (Qwen3 and other reasoning models)
            const raw  = parsed.choices?.[0]?.message?.content || '';
            const text = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

            // Return in Anthropic response format so the HTML needs no changes
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ content: [{ type: 'text', text }] }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Failed to parse AI response: ' + e.message } }));
          }
        });
      });

      upstream.on('error', err => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: `Cannot reach AI server at ${aiUrl}: ${err.message}` } }));
      });

      upstream.write(ollamaBody);
      upstream.end();
    });
    return;
  }

  // ── Static files ──────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const urlPath  = req.url === '/' ? '/mealie-recipe-importer.html' : req.url;
    const filePath = path.join(__dirname, 'public', urlPath);
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
      res.end(data);
    });
  }

}).listen(PORT, () => {
  console.log(`\nMealie Recipe Importer running at http://localhost:${PORT}\n`);
});
