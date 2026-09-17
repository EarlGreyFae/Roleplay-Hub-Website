// =========================================================================
// Roleplay Hub - Production WebSocket Relay & Cloud Persistent Hub Server
// Connects iPhone, Android, and PC across any distance in real time
// Automatically syncs DMs, World Invites, Channels, Messages & Character Lore
// =========================================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Render sets the PORT environment variable (default: 10000 on Render)
const PORT = process.env.PORT || 10000;

// Determine root directory
const rootDir = fs.existsSync(path.join(__dirname, 'index.html'))
  ? __dirname
  : path.join(__dirname, '..');

const DATA_FILE = path.join(rootDir, 'hub_data.json');

// Initial seed data including GrimGerbil's world and DM invite
const INITIAL_HUB_DATA = {
  worlds: [
    {
      id: 'world_aethelgard',
      name: 'Aethelgard: Astral Frontier',
      genre: 'High Mystery Fantasy',
      tagline: 'Ancient celestial ruins humming with forgotten songs and wild frontiers.',
      description: 'A continent suspended between twilight seas and shattered astral gates. Haven taverns shelter travelers investigating lunar anomalies.',
      coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
      creatorUserId: 'user_player1',
      creatorHandle: '@EarlGreyFae',
      members: [
        { userId: 'user_player1', handle: '@EarlGreyFae', role: 'creator', joinedAt: '2026-09-16T00:00:00.000Z' },
        { userId: 'user_grimgerbil', handle: '@GrimGerbil', role: 'editor', joinedAt: '2026-09-16T19:00:00.000Z' }
      ]
    },
    {
      id: 'world_neoveridia',
      name: 'Neo-Veridia: Neon Shadows',
      genre: 'Cyberpunk Detective',
      tagline: 'High-tech towers and rainy back-alleys under perpetual artificial twilight.',
      description: 'A layered megalopolis where netrunners, rogue synths, and private investigators clash over corporate secrets.',
      coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
      creatorUserId: 'user_player1',
      creatorHandle: '@EarlGreyFae',
      members: [
        { userId: 'user_player1', handle: '@EarlGreyFae', role: 'creator', joinedAt: '2026-09-16T00:00:00.000Z' }
      ]
    },
    {
      id: 'world_wonderworld',
      name: "Wonderworld",
      genre: 'Fantasy Frontier & Survival',
      tagline: 'A rugged bastion built on the edge of the uncharted wilderness.',
      description: 'Created by GrimGerbil as a shared collaborative realm for our campaigns. A fortified haven overlooking the frontier.',
      coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
      creatorUserId: 'user_grimgerbil',
      creatorHandle: '@GrimGerbil',
      members: [
        { userId: 'user_grimgerbil', handle: '@GrimGerbil', role: 'creator', joinedAt: '2026-09-16T19:00:00.000Z' },
        { userId: 'user_player1', handle: '@EarlGreyFae', role: 'editor', joinedAt: '2026-09-16T19:00:00.000Z' }
      ]
    }
  ],
  channels: [
    { id: 'ch_tavern', worldId: 'world_aethelgard', name: 'tavern-haven', description: 'The Gilded Gryphon tavern common room.', topic: 'Astral dust storm passing outside.' },
    { id: 'ch_ruins', worldId: 'world_aethelgard', name: 'shattered-gate', description: 'Expedition grounds near the ancient archway.', topic: 'Unlocking the lunar glyphs.' },
    { id: 'ch_downtown', worldId: 'world_neoveridia', name: 'sector-4-alley', description: 'Rain-soaked promenade near the Neon Dragon noodle bar.', topic: 'Investigating the blackouts.' },
    { id: 'ch_netspace', worldId: 'world_neoveridia', name: 'the-grid', description: 'Encrypted cyberspace nodes.', topic: 'Tracing the ghost signal.' },
    { id: 'ch_grim_main', worldId: 'world_wonderworld', name: 'main-roleplay', description: 'Primary IC roleplay scene thread for Grim\'s Outpost.', topic: 'Campfires burning along the ramparts.' },
    { id: 'ch_grim_images', worldId: 'world_wonderworld', name: 'related-images', description: 'Visual references, maps, and character art.', topic: 'Outpost topography and bastion maps.' },
    { id: 'ch_grim_ooc', worldId: 'world_wonderworld', name: 'ooc-lounge', description: 'Out-of-character chat, campaign planning, and questions.', topic: 'Plot coordination & session notes.' }
  ],
  messages: [],
  dmMessages: [
    {
      id: 'dm_grimgerbil_invite_1',
      senderUserId: 'user_grimgerbil',
      senderName: 'James',
      senderHandle: '@GrimGerbil',
      senderAvatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=GrimGerbil',
      recipientHandle: '@EarlGreyFae',
      content: "I created our world Wonderworld! Here is your invite to join.",
      inviteWorldId: 'world_wonderworld',
      inviteWorldName: "Wonderworld",
      inviteRole: 'editor',
      inviteStatus: 'pending',
      timestamp: '2026-09-16T19:15:00.000Z'
    }
  ],
  wikiEntries: []
};

// Safe entity merge helper that avoids Map corruption
function safeMapEntities(existingArr, newArr = []) {
  const map = new Map();
  (existingArr || []).forEach(item => {
    if (item && item.id) map.set(item.id, item);
  });
  (newArr || []).forEach(item => {
    if (item && item.id) map.set(item.id, item);
  });
  return Array.from(map.values());
}

// Load or initialize persistent hub data from disk
let hubData = { ...INITIAL_HUB_DATA };
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      // Merge saved data with defaults to ensure GrimGerbil's DM and world are always present
      hubData = {
        worlds: safeMapEntities(INITIAL_HUB_DATA.worlds, parsed.worlds),
        channels: safeMapEntities(INITIAL_HUB_DATA.channels, parsed.channels),
        messages: safeMapEntities(INITIAL_HUB_DATA.messages, parsed.messages),
        dmMessages: safeMapEntities(INITIAL_HUB_DATA.dmMessages, parsed.dmMessages),
        wikiEntries: safeMapEntities(INITIAL_HUB_DATA.wikiEntries, parsed.wikiEntries)
      };
      console.log(`[Storage] Loaded persistent hub data: ${hubData.worlds.length} worlds, ${hubData.dmMessages.length} DMs, ${hubData.messages.length} messages.`);
    }
  } else {
    fs.writeFileSync(DATA_FILE, JSON.stringify(hubData, null, 2), 'utf8');
    console.log('[Storage] Initialized new persistent hub_data.json on disk.');
  }
} catch (e) {
  console.error('[Storage] Error loading hub_data.json:', e.message);
}

function saveHubDataToDisk() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(hubData, null, 2), 'utf8');
  } catch (e) {
    console.error('[Storage] Error saving hub_data.json:', e.message);
  }
}

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

// HTTP Server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = (req.url || '/').split('?')[0];

  // Health check endpoint for Render.com
  if (reqUrl === '/healthz' || reqUrl === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'World Connection: Server Active',
      activeDevices: clients.size,
      uptimeSeconds: Math.floor(process.uptime()),
      dmCount: hubData.dmMessages.length,
      worldCount: hubData.worlds.length,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // GET /api/hub-data: Full synchronization endpoint
  if (reqUrl === '/api/hub-data' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(hubData));
    return;
  }

  // POST /api/send-dm: HTTP fallback for sending a Direct Message
  if (reqUrl === '/api/send-dm' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const newDM = JSON.parse(body);
        if (newDM && newDM.id) {
          hubData.dmMessages = safeMapEntities(hubData.dmMessages, [newDM]);
          saveHubDataToDisk();
          broadcastToClients({ type: 'NEW_DM', data: newDM });
          console.log(`[DM] Stored & broadcast DM (${newDM.id}) from ${newDM.senderHandle} to ${newDM.recipientHandle}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, dm: newDM }));
          return;
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid DM payload.' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // POST /api/sync: Full state merge over HTTP
  if (reqUrl === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (Array.isArray(data.worlds)) hubData.worlds = safeMapEntities(hubData.worlds, data.worlds);
        if (Array.isArray(data.channels)) hubData.channels = safeMapEntities(hubData.channels, data.channels);
        if (Array.isArray(data.messages)) hubData.messages = safeMapEntities(hubData.messages, data.messages);
        if (Array.isArray(data.dmMessages)) hubData.dmMessages = safeMapEntities(hubData.dmMessages, data.dmMessages);
        if (Array.isArray(data.wikiEntries)) hubData.wikiEntries = safeMapEntities(hubData.wikiEntries, data.wikiEntries);
        saveHubDataToDisk();
        broadcastToClients({ type: 'CLOUD_SYNC_RESTORE', data: hubData });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, hubData }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
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

function broadcastToClients(payload, exceptWs = null) {
  const msgStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  for (const client of clients) {
    if (client !== exceptWs && client.readyState === WebSocket.OPEN) {
      client.send(msgStr);
    }
  }
}

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

  // CRITICAL: Immediately send all persistent hub data (all DMs, messages, worlds, channels) to newly connected device
  ws.send(JSON.stringify({
    type: 'CLOUD_SYNC_RESTORE',
    data: hubData
  }));

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const msgStr = raw.toString();
      const parsed = JSON.parse(msgStr);

      // Handle NEW_DM (e.g. husband DM'ing wife or sending a world invite)
      if (parsed.type === 'NEW_DM' && parsed.data) {
        const dm = parsed.data;
        if (dm && dm.id) {
          hubData.dmMessages = safeMapEntities(hubData.dmMessages, [dm]);
          saveHubDataToDisk();
          console.log(`[DM] Preserved new DM from ${dm.senderHandle} to ${dm.recipientHandle} (Invite: ${dm.inviteWorldName || 'none'})`);
        }
        broadcastToClients(msgStr, ws);
        return;
      }

      // Handle NEW_MESSAGE (in-character channels)
      if (parsed.type === 'NEW_MESSAGE' && parsed.data) {
        const msg = parsed.data;
        const exists = hubData.messages.some(m => m.id === msg.id);
        if (!exists) {
          hubData.messages.push(msg);
          saveHubDataToDisk();
        }
        broadcastToClients(msgStr, ws);
        return;
      }

      // Handle NEW_WORLD
      if (parsed.type === 'NEW_WORLD' && parsed.data) {
        const { world, channels } = parsed.data;
        if (world) {
          hubData.worlds = Array.from(new Map([...hubData.worlds, [world.id, world]]).values());
        }
        if (Array.isArray(channels)) {
          hubData.channels = Array.from(new Map([...hubData.channels, ...channels.map(c => [c.id, c])]).values());
        }
        saveHubDataToDisk();
        console.log(`[World] Preserved new world: ${world?.name} by ${world?.creatorHandle}`);
        broadcastToClients(msgStr, ws);
        return;
      }

      // Handle UPDATE_WORLD
      if (parsed.type === 'UPDATE_WORLD' && parsed.data) {
        hubData.worlds = hubData.worlds.map(w => w.id === parsed.data.id ? parsed.data : w);
        saveHubDataToDisk();
        broadcastToClients(msgStr, ws);
        return;
      }

      // Handle UPDATE_WIKI
      if (parsed.type === 'UPDATE_WIKI' && parsed.data) {
        const exists = hubData.wikiEntries.some(w => w.id === parsed.data.id);
        hubData.wikiEntries = exists
          ? hubData.wikiEntries.map(w => w.id === parsed.data.id ? parsed.data : w)
          : [...hubData.wikiEntries, parsed.data];
        saveHubDataToDisk();
        broadcastToClients(msgStr, ws);
        return;
      }

      // Handle CLOUD_SYNC payload
      if (parsed.type === 'CLOUD_SYNC' && parsed.data) {
        if (parsed.data.worlds) hubData.worlds = Array.from(new Map([...hubData.worlds, ...parsed.data.worlds.map(w => [w.id, w])]).values());
        if (parsed.data.channels) hubData.channels = Array.from(new Map([...hubData.channels, ...parsed.data.channels.map(c => [c.id, c])]).values());
        if (parsed.data.dmMessages) hubData.dmMessages = Array.from(new Map([...hubData.dmMessages, ...parsed.data.dmMessages.map(d => [d.id, d])]).values());
        if (parsed.data.messages) hubData.messages = Array.from(new Map([...hubData.messages, ...parsed.data.messages.map(m => [m.id, m])]).values());
        if (parsed.data.wikiEntries) hubData.wikiEntries = Array.from(new Map([...hubData.wikiEntries, ...parsed.data.wikiEntries.map(w => [w.id, w])]).values());
        saveHubDataToDisk();
        console.log(`[★] Cloud state synced by ${parsed.accountHandle || 'user'} at ${new Date().toISOString()}`);
        broadcastToClients(msgStr, ws);
        return;
      }

      // Relay any other real-time messages
      broadcastToClients(msgStr, ws);
    } catch (e) {
      console.error('[WS] Error processing message:', e.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[-] Device disconnected. Total remaining: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
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
  console.log(`>>> Roleplay Hub Relay & Persistent Storage listening on port ${PORT} <<<`);
  console.log(`>>> Real-time synchronization active for all devices <<<`);
  console.log(`=======================================================`);
});
