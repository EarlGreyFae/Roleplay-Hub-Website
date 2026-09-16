// =========================================================================
// Roleplay Hub - Production WebSocket Relay & Cloud Auto-Sync Server
// Optimized for 24/7 Hosting on Render.com Free Tier
// Connects iPhone and Android across any distance in real time
// =========================================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Render sets the PORT environment variable (default: 10000 on Render)
const PORT = process.env.PORT || 10000;

// In-memory cache for latest world and chat state
let latestCloudSnapshot = null;

// MIME type map for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

// Determine root directory whether server.js is at root or in /server/
const rootDir = fs.existsSync(path.join(__dirname, 'index.html'))
  ? __dirname
  : path.join(__dirname, '..');

// HTTP Server: Serves health checks for Render and the web app directly
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse request URL
  const reqUrl = (req.url || '/').split('?')[0];

  // Health check endpoint for Render.com zero-downtime monitor
  if (reqUrl === '/healthz' || reqUrl === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'World Connection: Server Active',
      activeDevices: clients.size,
      uptimeSeconds: Math.floor(process.uptime()),
      hasCloudSnapshot: !!latestCloudSnapshot,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Snapshot API endpoint
  if (reqUrl === '/api/snapshot') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(latestCloudSnapshot || { message: 'No snapshot saved yet' }));
    return;
  }

  // Map static asset paths
  let targetFile = (reqUrl === '/' || reqUrl === '') ? 'index.html' : reqUrl.replace(/^\/+/, '');

  let filePath = path.join(rootDir, targetFile);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(rootDir, 'standalone', targetFile);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // Fallback to index.html for SPA routing
    let indexPath = path.join(rootDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      indexPath = path.join(rootDir, 'standalone', 'index.html');
    }
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }
});

// WebSocket Server attached to same HTTP port
const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  ws.isAlive = true;

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`[+] Device connected from ${ip}. Total online: ${clients.size}`);

  // Send server confirmation & connection status
  ws.send(JSON.stringify({
    type: 'SERVER_STATUS',
    status: 'World Connection: Server Active',
    activeConnections: clients.size,
    timestamp: new Date().toISOString()
  }));

  // If there's an existing cloud snapshot, sync it to this newly connected device
  if (latestCloudSnapshot) {
    ws.send(JSON.stringify({
      type: 'CLOUD_SYNC_RESTORE',
      data: latestCloudSnapshot
    }));
  }

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data) => {
    try {
      const msgStr = data.toString();
      const parsed = JSON.parse(msgStr);

      // If this is a cloud auto-sync payload, store the latest snapshot
      if (parsed.type === 'CLOUD_SYNC' && parsed.data) {
        latestCloudSnapshot = parsed.data;
        console.log(`[★] Cloud state auto-synced by ${parsed.accountEmail || 'user'} at ${new Date().toISOString()}`);
      }

      // Relay message in real-time to all other connected devices (e.g. husband's phone)
      for (const client of clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(msgStr);
        }
      }
    } catch (e) {
      console.error('Error processing message:', e.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[-] Device disconnected. Total remaining: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
});

// Keepalive Ping/Pong Interval (Every 30s)
const keepAliveInterval = setInterval(() => {
  for (const ws of clients) {
    if (ws.isAlive === false) {
      clients.delete(ws);
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

wss.on('close', () => {
  clearInterval(keepAliveInterval);
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`>>> Roleplay Hub Relay Server listening on port ${PORT} <<<`);
  console.log(`>>> Ready for Render.com deployment <<<`);
  console.log(`=======================================================`);
});
